#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error,
    symbol_short, token, Address, Env, Map, String, Symbol, Vec,
};

// ========================================
// CONSTANTS
// ========================================

/// Precision multiplier for reward calculations (1e18).
/// Prevents integer division precision loss.
const PRECISION: u128 = 1_000_000_000_000_000_000;

/// Instance TTL target (CAP-0053): ~31 days at 5 s/ledger. Every function
/// that writes storage extends the contract instance (and its code) to this
/// many ledgers.
const INSTANCE_TTL_EXTEND_TO: u32 = 535_680;

/// `INSTANCE_TTL_EXTEND_TO` minus ~1 day (17_280 ledgers). The extension, and
/// the rent it costs, only happens once the remaining TTL drops below this.
const INSTANCE_TTL_THRESHOLD: u32 = 518_400;

// Storage keys (all in instance storage)
const ADMIN: Symbol = symbol_short!("ADMIN");
const TOKEN: Symbol = symbol_short!("TOKEN");
const PAUSED: Symbol = symbol_short!("PAUSED");
const ISSUERS: Symbol = symbol_short!("ISSUERS");
const PARTICIPANTS: Symbol = symbol_short!("PARTICIP");
const NEXT_ID: Symbol = symbol_short!("NEXT_ID");
const PROJECTS: Symbol = symbol_short!("PROJECTS");
const NAMES: Symbol = symbol_short!("NAMES");
const SALES: Symbol = symbol_short!("SALES");
const REWARD_PAID: Symbol = symbol_short!("RWPAID");
const PENDING: Symbol = symbol_short!("PENDING");
const PENDING_CLAIM: Symbol = symbol_short!("PNDCLAIM");
const CLAIMED: Symbol = symbol_short!("CLAIMED");
const USER_PROJECTS: Symbol = symbol_short!("USRPRJ");
const TOTAL_SALES: Symbol = symbol_short!("T_SALES");

// ========================================
// ERRORS
// ========================================

/// Contract error codes. The numeric values are part of the public
/// interface (the frontend maps each code to a message) and must never be
/// renumbered.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Caller is not the contract admin.
    NotAdmin = 1,
    /// Caller is not the creator of the project.
    NotCreator = 2,
    /// Account is not a verified issuer.
    NotIssuer = 3,
    /// Account is not an approved participant (simulated KYC allowlist).
    NotParticipant = 4,
    /// The contract is paused: purchases and revenue deposits are blocked.
    Paused = 5,
    /// No project exists with the given id.
    ProjectNotFound = 6,
    /// The project is not active.
    ProjectInactive = 7,
    /// An amount or project parameter is zero or out of range.
    InvalidAmount = 8,
    /// Purchase amount is below the project's minimum purchase.
    BelowMinimum = 9,
    /// Not enough unminted supply left for this purchase.
    InsufficientSupply = 10,
    /// Withdrawal exceeds the project's sales balance.
    InsufficientBalance = 11,
    /// Revenue cannot be deposited before any participation is minted.
    NoTokensMinted = 12,
    /// Arithmetic overflow.
    Overflow = 13,
    /// Deposit too small to move the reward-per-token index.
    RewardTooSmall = 14,
}

// ========================================
// TYPES
// ========================================

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct Project {
    pub creator: Address,
    pub total_supply: u128,
    pub minted: u128,
    pub min_purchase: u128,
    pub price: u128,
    pub created_at: u64,
    pub active: bool,
    pub total_energy_kwh: u128,
    pub total_revenue: u128,
    pub reward_per_token_stored: u128,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct InvestorPosition {
    pub project_id: u64,
    pub token_balance: u128,
    pub claimable_amount: u128,
    pub total_claimed: u128,
}

// ========================================
// EVENTS
// ========================================
// Every state mutation publishes one event. The first topic is the event
// name, the remaining topics are the indexed keys (project id or account),
// and the data is a map keyed by field name.

/// `create_project`: a verified issuer registered a new project.
#[contractevent(topics = ["created"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectCreated {
    #[topic]
    pub project_id: u64,
    pub creator: Address,
    pub name: String,
    pub supply: u128,
    pub price: u128,
    pub min_purchase: u128,
}

/// `purchase_tokens`: `total_price` stroops moved from `buyer` to the contract.
#[contractevent(topics = ["purchase"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokensPurchased {
    #[topic]
    pub project_id: u64,
    #[topic]
    pub buyer: Address,
    pub amount: u128,
    pub total_price: u128,
}

/// `deposit_revenue`: the creator deposited revenue for the holders.
#[contractevent(topics = ["deposit"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RevenueDeposited {
    #[topic]
    pub project_id: u64,
    pub amount: u128,
    pub energy_delta: u128,
}

/// `update_energy`: accumulated energy (kWh) reported by the creator.
#[contractevent(topics = ["energy"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EnergyUpdated {
    #[topic]
    pub project_id: u64,
    pub energy_delta: u128,
    pub total: u128,
}

/// `claim_revenue`: `amount` stroops paid out to `investor`.
#[contractevent(topics = ["claim"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RevenueClaimed {
    #[topic]
    pub project_id: u64,
    #[topic]
    pub investor: Address,
    pub amount: u128,
}

/// `withdraw_sales`: `amount` stroops of sales paid out to the creator.
#[contractevent(topics = ["withdraw"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SalesWithdrawn {
    #[topic]
    pub project_id: u64,
    pub amount: u128,
}

/// `set_project_status`: the project was activated or deactivated.
#[contractevent(topics = ["status"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectStatusChanged {
    #[topic]
    pub project_id: u64,
    pub active: bool,
}

/// `transfer_ownership`: the project now belongs to `new_creator`.
#[contractevent(topics = ["owner"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OwnershipTransferred {
    #[topic]
    pub project_id: u64,
    pub new_creator: Address,
}

/// `set_issuer`: issuer verification granted or revoked.
#[contractevent(topics = ["issuer"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IssuerUpdated {
    #[topic]
    pub account: Address,
    pub verified: bool,
}

/// `set_participant`: participant approval (simulated KYC) granted or revoked.
#[contractevent(topics = ["kyc"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ParticipantUpdated {
    #[topic]
    pub account: Address,
    pub approved: bool,
}

/// `set_paused`: the global pause was switched on or off.
#[contractevent(topics = ["paused"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PauseUpdated {
    pub paused: bool,
}

/// `__constructor` and `set_admin`: the admin is now `new_admin`.
#[contractevent(topics = ["admin"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminUpdated {
    pub new_admin: Address,
}

// ========================================
// INTERNAL HELPERS
// ========================================

/// Extend the TTL of the contract instance and its code (CAP-0053).
/// Called by every function that writes storage.
fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);
}

/// Stored admin. ADMIN is written by `__constructor`, which the host runs
/// atomically with the deployment (CAP-0058), so the `None` branch cannot be
/// reached; it maps to `NotAdmin` because there is no admin to match.
fn read_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&ADMIN)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotAdmin))
}

/// Payment token (native XLM SAC). Also written by `__constructor`, so the
/// `None` branch cannot be reached either (same mapping as `read_admin`).
fn read_token(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&TOKEN)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotAdmin))
}

/// `admin` must sign and must be the stored admin.
fn require_admin(env: &Env, admin: &Address) {
    admin.require_auth();
    if *admin != read_admin(env) {
        panic_with_error!(env, Error::NotAdmin);
    }
}

fn read_paused(env: &Env) -> bool {
    env.storage().instance().get(&PAUSED).unwrap_or(false)
}

/// Global pause guard. Only the entry points (`purchase_tokens`,
/// `deposit_revenue`) call it; the exits (`claim_revenue`, `withdraw_sales`)
/// never do, so participants and creators can always get their XLM out.
fn require_not_paused(env: &Env) {
    if read_paused(env) {
        panic_with_error!(env, Error::Paused);
    }
}

/// Read a per-account flag from an allowlist (issuers or participants).
fn has_flag(env: &Env, key: &Symbol, account: &Address) -> bool {
    let flags: Map<Address, bool> = env
        .storage()
        .instance()
        .get(key)
        .unwrap_or_else(|| Map::new(env));
    flags.get(account.clone()).unwrap_or(false)
}

/// Grant (`true`) or revoke (`false`) a per-account flag. Revoking removes
/// the entry so the instance does not keep stale accounts.
fn write_flag(env: &Env, key: &Symbol, account: &Address, value: bool) {
    let mut flags: Map<Address, bool> = env
        .storage()
        .instance()
        .get(key)
        .unwrap_or_else(|| Map::new(env));
    if value {
        flags.set(account.clone(), true);
    } else {
        flags.remove(account.clone());
    }
    env.storage().instance().set(key, &flags);
}

/// Token client bound to the payment token configured at construction.
fn token_client(env: &Env) -> token::TokenClient<'_> {
    token::TokenClient::new(env, &read_token(env))
}

/// Load the projects map together with one project (`ProjectNotFound` if it
/// does not exist).
fn load_project(env: &Env, project_id: u64) -> (Map<u64, Project>, Project) {
    let projects: Map<u64, Project> = env
        .storage()
        .instance()
        .get(&PROJECTS)
        .unwrap_or_else(|| Map::new(env));
    let project = projects
        .get(project_id)
        .unwrap_or_else(|| panic_with_error!(env, Error::ProjectNotFound));
    (projects, project)
}

fn require_creator(env: &Env, project: &Project, caller: &Address) {
    if project.creator != *caller {
        panic_with_error!(env, Error::NotCreator);
    }
}

fn require_active(env: &Env, project: &Project) {
    if !project.active {
        panic_with_error!(env, Error::ProjectInactive);
    }
}

fn add_or_overflow(env: &Env, a: u128, b: u128) -> u128 {
    a.checked_add(b)
        .unwrap_or_else(|| panic_with_error!(env, Error::Overflow))
}

fn sub_or_overflow(env: &Env, a: u128, b: u128) -> u128 {
    a.checked_sub(b)
        .unwrap_or_else(|| panic_with_error!(env, Error::Overflow))
}

fn mul_or_overflow(env: &Env, a: u128, b: u128) -> u128 {
    a.checked_mul(b)
        .unwrap_or_else(|| panic_with_error!(env, Error::Overflow))
}

/// Convert a u128 amount to the i128 the token interface takes, failing
/// with `err` when it does not fit.
fn to_token_amount(env: &Env, amount: u128, err: Error) -> i128 {
    i128::try_from(amount).unwrap_or_else(|_| panic_with_error!(env, err))
}

/// Rewards accrued on `balance` since its `paid` checkpoint (multiply before
/// divide to preserve precision).
///
/// `paid` is always a value copied from `reward_per_token_stored`, which only
/// ever grows, so `paid <= reward_per_token` holds. The saturating
/// subtraction keeps the original meaning ("nothing new accrued") of the
/// previous `checked_sub(..).unwrap_or(0)` and is equivalent to it.
fn accrued_rewards(env: &Env, balance: u128, reward_per_token: u128, paid: u128) -> u128 {
    let delta = reward_per_token.saturating_sub(paid);
    mul_or_overflow(env, balance, delta) / PRECISION
}

// ========================================
// CONTRACT
// ========================================

#[contract]
pub struct NikoProject;

#[contractimpl]
impl NikoProject {
    // ========================================
    // CONSTRUCTOR
    // ========================================

    /// Contract constructor. The Soroban host calls this exactly once at
    /// contract creation (protocol >= 22 native constructor support) and
    /// reentry into it is prohibited, so this fully replaces the old
    /// `initialize` function and its front-runnable "first caller wins"
    /// window. `token` is the native XLM Stellar Asset Contract.
    pub fn __constructor(env: Env, admin: Address, token: Address) {
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&TOKEN, &token);
        env.storage().instance().set(&PAUSED, &false);
        env.storage().instance().set(&NEXT_ID, &1_u64);
        env.storage().instance().set(&TOTAL_SALES, &0_u128);
        extend_instance_ttl(&env);

        AdminUpdated { new_admin: admin }.publish(&env);
    }

    // ========================================
    // ADMIN
    // ========================================

    /// Rotate the admin. Only the current admin, with its signature.
    pub fn set_admin(env: Env, admin: Address, new_admin: Address) {
        require_admin(&env, &admin);

        env.storage().instance().set(&ADMIN, &new_admin);
        extend_instance_ttl(&env);

        AdminUpdated { new_admin }.publish(&env);
    }

    /// Global pause. While paused, `purchase_tokens` and `deposit_revenue`
    /// fail with `Paused`; `claim_revenue` and `withdraw_sales` keep working.
    pub fn set_paused(env: Env, admin: Address, paused: bool) {
        require_admin(&env, &admin);

        env.storage().instance().set(&PAUSED, &paused);
        extend_instance_ttl(&env);

        PauseUpdated { paused }.publish(&env);
    }

    /// Grant or revoke issuer verification (who may create projects).
    pub fn set_issuer(env: Env, admin: Address, account: Address, verified: bool) {
        require_admin(&env, &admin);

        write_flag(&env, &ISSUERS, &account, verified);
        extend_instance_ttl(&env);

        IssuerUpdated { account, verified }.publish(&env);
    }

    /// Grant or revoke participant approval (simulated off-chain KYC
    /// allowlist: who may purchase).
    pub fn set_participant(env: Env, admin: Address, account: Address, approved: bool) {
        require_admin(&env, &admin);

        write_flag(&env, &PARTICIPANTS, &account, approved);
        extend_instance_ttl(&env);

        ParticipantUpdated { account, approved }.publish(&env);
    }

    // ========================================
    // ADMIN / TOKEN VIEWS
    // ========================================

    /// Get the contract admin address.
    pub fn get_admin(env: Env) -> Address {
        read_admin(&env)
    }

    /// Get the payment token address used for purchases and revenue.
    pub fn get_token(env: Env) -> Address {
        read_token(&env)
    }

    /// Whether the global pause is on.
    pub fn is_paused(env: Env) -> bool {
        read_paused(&env)
    }

    /// Whether `account` is a verified issuer.
    pub fn is_issuer(env: Env, account: Address) -> bool {
        has_flag(&env, &ISSUERS, &account)
    }

    /// Whether `account` is an approved participant.
    pub fn is_participant(env: Env, account: Address) -> bool {
        has_flag(&env, &PARTICIPANTS, &account)
    }

    // ========================================
    // CREATE PROJECT
    // ========================================

    /// Create a new solar project. Returns the project ID. Only verified
    /// issuers may create projects.
    pub fn create_project(
        env: Env,
        creator: Address,
        name: String,
        total_supply: u128,
        price: u128,
        min_purchase: u128,
    ) -> u64 {
        creator.require_auth();

        if !has_flag(&env, &ISSUERS, &creator) {
            panic_with_error!(&env, Error::NotIssuer);
        }

        // Validate inputs
        if total_supply == 0 || price == 0 || min_purchase == 0 || min_purchase > total_supply {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let project_id: u64 = env
            .storage()
            .instance()
            .get(&NEXT_ID)
            .unwrap_or(1);
        let next = project_id
            .checked_add(1)
            .unwrap_or_else(|| panic_with_error!(&env, Error::Overflow));
        env.storage().instance().set(&NEXT_ID, &next);

        let project = Project {
            creator: creator.clone(),
            total_supply,
            minted: 0,
            min_purchase,
            price,
            created_at: env.ledger().timestamp(),
            active: true,
            total_energy_kwh: 0,
            total_revenue: 0,
            reward_per_token_stored: 0,
        };

        // Store project
        let mut projects: Map<u64, Project> = env
            .storage()
            .instance()
            .get(&PROJECTS)
            .unwrap_or(Map::new(&env));
        projects.set(project_id, project);
        env.storage().instance().set(&PROJECTS, &projects);

        // Store name
        let mut names: Map<u64, String> = env
            .storage()
            .instance()
            .get(&NAMES)
            .unwrap_or(Map::new(&env));
        names.set(project_id, name.clone());
        env.storage().instance().set(&NAMES, &names);

        // Track user projects
        let mut user_projects: Map<Address, Vec<u64>> = env
            .storage()
            .instance()
            .get(&USER_PROJECTS)
            .unwrap_or(Map::new(&env));
        let mut up = user_projects
            .get(creator.clone())
            .unwrap_or(Vec::new(&env));
        up.push_back(project_id);
        user_projects.set(creator.clone(), up);
        env.storage()
            .instance()
            .set(&USER_PROJECTS, &user_projects);

        extend_instance_ttl(&env);

        ProjectCreated {
            project_id,
            creator,
            name,
            supply: total_supply,
            price,
            min_purchase,
        }
        .publish(&env);

        project_id
    }

    // ========================================
    // PURCHASE TOKENS (mint)
    // ========================================

    /// Purchase project tokens. The required XLM payment is transferred
    /// from the buyer to the contract via the configured payment token.
    /// The buyer must be an approved participant, the contract must not be
    /// paused, and the project must already exist and be active; there is
    /// no auto-initialization or auto-creation of projects.
    pub fn purchase_tokens(env: Env, buyer: Address, project_id: u64, amount: u128) {
        buyer.require_auth();

        require_not_paused(&env);
        if !has_flag(&env, &PARTICIPANTS, &buyer) {
            panic_with_error!(&env, Error::NotParticipant);
        }

        let (mut projects, mut project) = load_project(&env, project_id);

        // ── Security checks ──
        require_active(&env, &project);
        if amount < project.min_purchase {
            panic_with_error!(&env, Error::BelowMinimum);
        }
        let new_minted = project
            .minted
            .checked_add(amount)
            .filter(|v| *v <= project.total_supply)
            .unwrap_or_else(|| panic_with_error!(&env, Error::InsufficientSupply));

        // Calculate total price with overflow protection
        let total_price = mul_or_overflow(&env, project.price, amount);
        let payment = to_token_amount(&env, total_price, Error::Overflow);

        // ── Move payment: buyer -> contract ──
        token_client(&env).transfer(&buyer, env.current_contract_address(), &payment);

        // ── Reward settlement (must happen BEFORE the buyer's balance changes) ──
        // A buyer's balance increasing after rewards have already accrued
        // must not let them retroactively claim rewards that accrued
        // before this purchase. So we settle whatever is currently
        // earned-but-unclaimed at the OLD balance into PENDING_CLAIM,
        // bump the REWARD_PAID checkpoint to the current reward index,
        // and only then increase the balance below.
        let mut balances: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&PENDING)
            .unwrap_or(Map::new(&env));
        let current_balance = balances.get((project_id, buyer.clone())).unwrap_or(0);

        let mut reward_paid: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&REWARD_PAID)
            .unwrap_or(Map::new(&env));

        // With a zero balance nothing could have accrued yet: only the
        // checkpoint below is needed.
        if current_balance > 0 {
            let paid = reward_paid.get((project_id, buyer.clone())).unwrap_or(0);
            let newly_earned = accrued_rewards(
                &env,
                current_balance,
                project.reward_per_token_stored,
                paid,
            );

            if newly_earned > 0 {
                let mut pending_claim: Map<(u64, Address), u128> = env
                    .storage()
                    .instance()
                    .get(&PENDING_CLAIM)
                    .unwrap_or(Map::new(&env));
                let prev_pending = pending_claim
                    .get((project_id, buyer.clone()))
                    .unwrap_or(0);
                pending_claim.set(
                    (project_id, buyer.clone()),
                    add_or_overflow(&env, prev_pending, newly_earned),
                );
                env.storage().instance().set(&PENDING_CLAIM, &pending_claim);
            }
        }
        reward_paid.set(
            (project_id, buyer.clone()),
            project.reward_per_token_stored,
        );
        env.storage().instance().set(&REWARD_PAID, &reward_paid);

        // ── Update project state ──
        // Sales proceeds are NOT revenue: `total_revenue` only accumulates
        // `deposit_revenue` amounts (invariant I10).
        project.minted = new_minted;
        projects.set(project_id, project);
        env.storage().instance().set(&PROJECTS, &projects);

        // Update sales balance
        let mut sales: Map<u64, u128> = env
            .storage()
            .instance()
            .get(&SALES)
            .unwrap_or(Map::new(&env));
        let current_sales = sales.get(project_id).unwrap_or(0);
        sales.set(project_id, add_or_overflow(&env, current_sales, total_price));
        env.storage().instance().set(&SALES, &sales);

        // Update total sales
        let total_sales: u128 = env
            .storage()
            .instance()
            .get(&TOTAL_SALES)
            .unwrap_or(0);
        env.storage().instance().set(
            &TOTAL_SALES,
            &add_or_overflow(&env, total_sales, total_price),
        );

        // Update buyer's balance (after the reward settlement above)
        balances.set(
            (project_id, buyer.clone()),
            add_or_overflow(&env, current_balance, amount),
        );
        env.storage().instance().set(&PENDING, &balances);

        extend_instance_ttl(&env);

        TokensPurchased {
            project_id,
            buyer,
            amount,
            total_price,
        }
        .publish(&env);
    }

    // ========================================
    // DEPOSIT REVENUE
    // ========================================

    /// Deposit revenue for distribution to token holders. Only the project
    /// creator may deposit, only while the contract is not paused, and only
    /// once tokens have been minted (otherwise funds would be locked in the
    /// contract with no claimant). The deposited amount is transferred from
    /// the depositor to the contract via the configured payment token.
    pub fn deposit_revenue(
        env: Env,
        depositor: Address,
        project_id: u64,
        amount: u128,
        energy_kwh_delta: u128,
    ) {
        depositor.require_auth();

        require_not_paused(&env);

        let (mut projects, mut project) = load_project(&env, project_id);

        require_creator(&env, &project, &depositor);
        require_active(&env, &project);
        if amount == 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        if project.minted == 0 {
            panic_with_error!(&env, Error::NoTokensMinted);
        }
        let deposit = to_token_amount(&env, amount, Error::InvalidAmount);

        // Multiply before divide to preserve precision
        let reward_increase = mul_or_overflow(&env, amount, PRECISION) / project.minted;
        if reward_increase == 0 {
            panic_with_error!(&env, Error::RewardTooSmall);
        }

        // ── Move revenue: depositor -> contract ──
        token_client(&env).transfer(&depositor, env.current_contract_address(), &deposit);

        project.reward_per_token_stored =
            add_or_overflow(&env, project.reward_per_token_stored, reward_increase);
        project.total_revenue = add_or_overflow(&env, project.total_revenue, amount);

        if energy_kwh_delta > 0 {
            project.total_energy_kwh =
                add_or_overflow(&env, project.total_energy_kwh, energy_kwh_delta);
        }

        projects.set(project_id, project);
        env.storage().instance().set(&PROJECTS, &projects);

        extend_instance_ttl(&env);

        RevenueDeposited {
            project_id,
            amount,
            energy_delta: energy_kwh_delta,
        }
        .publish(&env);
    }

    // ========================================
    // UPDATE ENERGY
    // ========================================

    /// Increment energy generated (accumulative). Creator only.
    pub fn update_energy(env: Env, caller: Address, project_id: u64, energy_delta: u128) {
        caller.require_auth();

        let (mut projects, mut project) = load_project(&env, project_id);

        require_creator(&env, &project, &caller);
        require_active(&env, &project);

        project.total_energy_kwh = add_or_overflow(&env, project.total_energy_kwh, energy_delta);
        let total = project.total_energy_kwh;
        projects.set(project_id, project);
        env.storage().instance().set(&PROJECTS, &projects);

        extend_instance_ttl(&env);

        EnergyUpdated {
            project_id,
            energy_delta,
            total,
        }
        .publish(&env);
    }

    // ========================================
    // CLAIM REVENUE
    // ========================================

    /// Claim pending revenue for a project. Pays out the sum of:
    /// - rewards accrued on the investor's current balance since their
    ///   last checkpoint, and
    /// - any PENDING_CLAIM amount settled earlier (see `purchase_tokens`)
    ///   from balance changes that happened before this claim.
    ///
    /// Never blocked by the global pause. State is updated before the
    /// payout (checks-effects-interactions).
    pub fn claim_revenue(env: Env, investor: Address, project_id: u64) -> u128 {
        investor.require_auth();

        let (_, project) = load_project(&env, project_id);

        let balances: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&PENDING)
            .unwrap_or(Map::new(&env));
        let balance = balances
            .get((project_id, investor.clone()))
            .unwrap_or(0);

        let mut reward_paid: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&REWARD_PAID)
            .unwrap_or(Map::new(&env));
        let paid = reward_paid
            .get((project_id, investor.clone()))
            .unwrap_or(0);

        let accrued = accrued_rewards(&env, balance, project.reward_per_token_stored, paid);

        let mut pending_claim: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&PENDING_CLAIM)
            .unwrap_or(Map::new(&env));
        let pending = pending_claim
            .get((project_id, investor.clone()))
            .unwrap_or(0);

        let earned = add_or_overflow(&env, accrued, pending);

        if earned == 0 {
            return 0;
        }

        let payout = to_token_amount(&env, earned, Error::Overflow);

        // Update reward checkpoint
        reward_paid.set(
            (project_id, investor.clone()),
            project.reward_per_token_stored,
        );
        env.storage().instance().set(&REWARD_PAID, &reward_paid);

        // Clear any settled pending-claim amount now that it is being paid out
        if pending > 0 {
            pending_claim.remove((project_id, investor.clone()));
            env.storage().instance().set(&PENDING_CLAIM, &pending_claim);
        }

        let mut claimed: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&CLAIMED)
            .unwrap_or(Map::new(&env));
        let prev_claimed = claimed
            .get((project_id, investor.clone()))
            .unwrap_or(0);
        claimed.set(
            (project_id, investor.clone()),
            add_or_overflow(&env, prev_claimed, earned),
        );
        env.storage().instance().set(&CLAIMED, &claimed);

        extend_instance_ttl(&env);

        // ── Pay out: contract -> investor ──
        token_client(&env).transfer(&env.current_contract_address(), &investor, &payout);

        RevenueClaimed {
            project_id,
            investor,
            amount: earned,
        }
        .publish(&env);

        earned
    }

    // ========================================
    // WITHDRAW SALES
    // ========================================

    /// Withdraw sales balance (creator only). Never blocked by the global
    /// pause.
    pub fn withdraw_sales(env: Env, caller: Address, project_id: u64, amount: u128) {
        caller.require_auth();

        let (_, project) = load_project(&env, project_id);
        require_creator(&env, &project, &caller);
        if amount == 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let payout = to_token_amount(&env, amount, Error::InvalidAmount);

        let mut sales: Map<u64, u128> = env
            .storage()
            .instance()
            .get(&SALES)
            .unwrap_or(Map::new(&env));
        let balance = sales.get(project_id).unwrap_or(0);
        if amount > balance {
            panic_with_error!(&env, Error::InsufficientBalance);
        }

        sales.set(project_id, sub_or_overflow(&env, balance, amount));
        env.storage().instance().set(&SALES, &sales);

        let total_sales: u128 = env
            .storage()
            .instance()
            .get(&TOTAL_SALES)
            .unwrap_or(0);
        env.storage().instance().set(
            &TOTAL_SALES,
            &sub_or_overflow(&env, total_sales, amount),
        );

        extend_instance_ttl(&env);

        // ── Pay out: contract -> creator ──
        token_client(&env).transfer(&env.current_contract_address(), &caller, &payout);

        SalesWithdrawn { project_id, amount }.publish(&env);
    }

    // ========================================
    // VIEW FUNCTIONS
    // ========================================

    /// Get project details.
    pub fn get_project(env: Env, project_id: u64) -> Project {
        let (_, project) = load_project(&env, project_id);
        project
    }

    /// Get project name.
    pub fn get_project_name(env: Env, project_id: u64) -> String {
        let names: Map<u64, String> = env
            .storage()
            .instance()
            .get(&NAMES)
            .unwrap_or(Map::new(&env));
        names
            .get(project_id)
            .unwrap_or(String::from_str(&env, ""))
    }

    /// Get sales balance for a project.
    pub fn get_sales_balance(env: Env, project_id: u64) -> u128 {
        let sales: Map<u64, u128> = env
            .storage()
            .instance()
            .get(&SALES)
            .unwrap_or(Map::new(&env));
        sales.get(project_id).unwrap_or(0)
    }

    /// Get claimable amount for an investor. Includes both rewards accrued
    /// on the current balance and any settled PENDING_CLAIM amount (see
    /// `purchase_tokens` / `claim_revenue`).
    pub fn get_claimable(env: Env, investor: Address, project_id: u64) -> u128 {
        let (_, project) = load_project(&env, project_id);

        let balances: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&PENDING)
            .unwrap_or(Map::new(&env));
        let balance = balances
            .get((project_id, investor.clone()))
            .unwrap_or(0);

        let reward_paid: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&REWARD_PAID)
            .unwrap_or(Map::new(&env));
        let paid = reward_paid
            .get((project_id, investor.clone()))
            .unwrap_or(0);

        let accrued = accrued_rewards(&env, balance, project.reward_per_token_stored, paid);

        let pending_claim: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&PENDING_CLAIM)
            .unwrap_or(Map::new(&env));
        let pending = pending_claim
            .get((project_id, investor))
            .unwrap_or(0);

        add_or_overflow(&env, accrued, pending)
    }

    /// Get investor portfolio. Fails with `Overflow` instead of reporting a
    /// wrong (zero) claimable amount.
    pub fn get_portfolio(env: Env, investor: Address, project_ids: Vec<u64>) -> Vec<InvestorPosition> {
        let projects: Map<u64, Project> = env
            .storage()
            .instance()
            .get(&PROJECTS)
            .unwrap_or(Map::new(&env));
        let balances: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&PENDING)
            .unwrap_or(Map::new(&env));
        let claimed: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&CLAIMED)
            .unwrap_or(Map::new(&env));
        let reward_paid: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&REWARD_PAID)
            .unwrap_or(Map::new(&env));
        let pending_claims: Map<(u64, Address), u128> = env
            .storage()
            .instance()
            .get(&PENDING_CLAIM)
            .unwrap_or(Map::new(&env));

        let mut positions = Vec::new(&env);
        for pid in project_ids.iter() {
            let project = projects
                .get(pid)
                .unwrap_or_else(|| panic_with_error!(&env, Error::ProjectNotFound));
            let balance = balances.get((pid, investor.clone())).unwrap_or(0);
            let total_claimed = claimed.get((pid, investor.clone())).unwrap_or(0);

            let paid = reward_paid.get((pid, investor.clone())).unwrap_or(0);
            let accrued = accrued_rewards(&env, balance, project.reward_per_token_stored, paid);
            let pending = pending_claims.get((pid, investor.clone())).unwrap_or(0);
            let claimable = add_or_overflow(&env, accrued, pending);

            positions.push_back(InvestorPosition {
                project_id: pid,
                token_balance: balance,
                claimable_amount: claimable,
                total_claimed,
            });
        }
        positions
    }

    /// Get user's project IDs.
    pub fn get_user_projects(env: Env, user: Address) -> Vec<u64> {
        let user_projects: Map<Address, Vec<u64>> = env
            .storage()
            .instance()
            .get(&USER_PROJECTS)
            .unwrap_or(Map::new(&env));
        user_projects.get(user).unwrap_or(Vec::new(&env))
    }

    /// Get next project ID.
    pub fn next_project_id(env: Env) -> u64 {
        env.storage().instance().get(&NEXT_ID).unwrap_or(1)
    }

    /// Get total sales balance across all projects.
    pub fn get_total_sales(env: Env) -> u128 {
        env.storage()
            .instance()
            .get(&TOTAL_SALES)
            .unwrap_or(0)
    }

    // ========================================
    // PROJECT STATUS
    // ========================================

    /// Toggle project active status (creator only).
    pub fn set_project_status(env: Env, caller: Address, project_id: u64, active: bool) {
        caller.require_auth();

        let (mut projects, mut project) = load_project(&env, project_id);
        require_creator(&env, &project, &caller);

        project.active = active;
        projects.set(project_id, project);
        env.storage().instance().set(&PROJECTS, &projects);

        extend_instance_ttl(&env);

        ProjectStatusChanged { project_id, active }.publish(&env);
    }

    // ========================================
    // TRANSFER OWNERSHIP
    // ========================================

    /// Transfer project ownership (creator only) to another verified issuer.
    pub fn transfer_ownership(env: Env, caller: Address, project_id: u64, new_creator: Address) {
        caller.require_auth();

        let (mut projects, mut project) = load_project(&env, project_id);
        require_creator(&env, &project, &caller);
        if !has_flag(&env, &ISSUERS, &new_creator) {
            panic_with_error!(&env, Error::NotIssuer);
        }

        let old_creator = project.creator.clone();
        project.creator = new_creator.clone();
        projects.set(project_id, project);
        env.storage().instance().set(&PROJECTS, &projects);

        // Update user_projects mapping
        let mut user_projects: Map<Address, Vec<u64>> = env
            .storage()
            .instance()
            .get(&USER_PROJECTS)
            .unwrap_or(Map::new(&env));

        // Remove from old creator
        let old_list = user_projects
            .get(old_creator.clone())
            .unwrap_or(Vec::new(&env));
        let mut new_old_list = Vec::new(&env);
        for pid in old_list.iter() {
            if pid != project_id {
                new_old_list.push_back(pid);
            }
        }
        user_projects.set(old_creator, new_old_list);

        // Add to new creator
        let mut new_list = user_projects
            .get(new_creator.clone())
            .unwrap_or(Vec::new(&env));
        new_list.push_back(project_id);
        user_projects.set(new_creator.clone(), new_list);

        env.storage()
            .instance()
            .set(&USER_PROJECTS, &user_projects);

        extend_instance_ttl(&env);

        OwnershipTransferred {
            project_id,
            new_creator,
        }
        .publish(&env);
    }
}

// ========================================
// TESTS
// ========================================

#[cfg(test)]
mod test {
    extern crate std;

    use super::*;
    use soroban_sdk::{
        map,
        testutils::{
            storage::Instance as _, Address as _, AuthorizedFunction, AuthorizedInvocation,
            Events as _, Ledger as _,
        },
        vec,
        xdr::{ScErrorCode, ScErrorType},
        Env, Event as _, IntoVal, InvokeError, Val,
    };

    // ----------------------------------------
    // Fixtures
    // ----------------------------------------

    /// Deploy the contract with a fresh admin and a real Stellar Asset
    /// Contract as the payment token, and mock all auths for the test.
    /// The admin also approves itself as a verified issuer, so the legacy
    /// tests can keep using it as the project creator.
    fn setup() -> (Env, Address, Address, NikoProjectClient<'static>) {
        let env = Env::default();
        let admin = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let sac = env.register_stellar_asset_contract_v2(token_admin);
        let token_address = sac.address();

        let contract_id = env.register(NikoProject, (&admin, &token_address));
        let client = NikoProjectClient::new(&env, &contract_id);

        env.mock_all_auths();

        client.set_issuer(&admin, &admin, &true);

        (env, admin, token_address, client)
    }

    /// Mint `amount` of the test payment token to `to`.
    fn mint(env: &Env, token_address: &Address, to: &Address, amount: i128) {
        token::StellarAssetClient::new(env, token_address).mint(to, &amount);
    }

    /// A fresh account approved by the admin as a participant (simulated KYC).
    fn participant(env: &Env, admin: &Address, client: &NikoProjectClient) -> Address {
        let account = Address::generate(env);
        client.set_participant(admin, &account, &true);
        account
    }

    /// A fresh account verified by the admin as an issuer.
    fn issuer(env: &Env, admin: &Address, client: &NikoProjectClient) -> Address {
        let account = Address::generate(env);
        client.set_issuer(admin, &account, &true);
        account
    }

    /// The standard test project: supply 1000, price 100, min purchase 10.
    fn solar_lima(env: &Env, client: &NikoProjectClient, creator: &Address) -> u64 {
        client.create_project(
            creator,
            &String::from_str(env, "Solar Lima"),
            &1000,
            &100,
            &10,
        )
    }

    /// A contract error as the `try_*` client methods return it.
    fn err(e: Error) -> soroban_sdk::Error {
        e.into()
    }

    /// Assert that a `try_*` call failed in the host (not with a contract
    /// error code). The host's `try_call` passes contract error codes
    /// through but narrows every other failure, the auth failure included,
    /// to `Error(Context, InvalidAction)`; the granular `Error(Auth, ..)`
    /// only shows up in the diagnostic events.
    fn assert_auth_rejected<T>(res: Result<T, Result<soroban_sdk::Error, InvokeError>>) {
        assert_eq!(
            res.err(),
            Some(Ok(soroban_sdk::Error::from_type_and_code(
                ScErrorType::Context,
                ScErrorCode::InvalidAction,
            )))
        );
    }

    fn val<T: IntoVal<Env, Val>>(env: &Env, v: T) -> Val {
        v.into_val(env)
    }

    // ----------------------------------------
    // Original tests (adapted to the allowlists and error codes)
    // ----------------------------------------

    #[test]
    fn test_constructor() {
        let (_env, admin, token_address, client) = setup();
        assert_eq!(client.get_admin(), admin);
        assert_eq!(client.get_token(), token_address);
        assert_eq!(client.next_project_id(), 1);
    }

    #[test]
    fn test_create_project() {
        let (env, admin, _token_address, client) = setup();

        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );

        assert_eq!(project_id, 1);
        assert_eq!(client.next_project_id(), 2);

        let project = client.get_project(&project_id);
        assert_eq!(project.creator, admin);
        assert_eq!(project.total_supply, 1000);
        assert_eq!(project.price, 100);
        assert!(project.active);
    }

    #[test]
    fn test_purchase_tokens() {
        let (env, admin, token_address, client) = setup();

        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );

        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);

        let token_client = token::TokenClient::new(&env, &token_address);
        let buyer_before = token_client.balance(&buyer);
        let contract_before = token_client.balance(&client.address);

        client.purchase_tokens(&buyer, &project_id, &50);

        let project = client.get_project(&project_id);
        assert_eq!(project.minted, 50);

        // price(100) * amount(50) = 5000 moved from buyer to contract
        assert_eq!(token_client.balance(&buyer), buyer_before - 5000);
        assert_eq!(token_client.balance(&client.address), contract_before + 5000);
    }

    #[test]
    fn test_purchase_tokens_insufficient_balance() {
        let (env, admin, _token_address, client) = setup();

        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );

        // Buyer is approved but was never minted any token balance, so the
        // SAC transfer must fail and the whole purchase must revert.
        //
        // The SAC's own error propagates unchanged: its BalanceError is
        // contract code 10, the same number as Error::InsufficientSupply.
        // A client must not read code 10 from purchase_tokens as "sold out"
        // without checking the remaining supply.
        let buyer = participant(&env, &admin, &client);
        assert_eq!(
            client.try_purchase_tokens(&buyer, &project_id, &50),
            Err(Ok(soroban_sdk::Error::from_contract_error(10)))
        );
        assert_eq!(client.get_project(&project_id).minted, 0);
        assert_eq!(client.get_sales_balance(&project_id), 0);
    }

    #[test]
    fn test_purchase_tokens_unknown_project_panics() {
        let (env, admin, token_address, client) = setup();

        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);

        // No project has ever been created: proves there is no auto-create.
        assert_eq!(
            client.try_purchase_tokens(&buyer, &999, &50),
            Err(Ok(err(Error::ProjectNotFound)))
        );
    }

    #[test]
    fn test_deposit_revenue() {
        let (env, admin, token_address, client) = setup();

        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );

        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &100);

        mint(&env, &token_address, &admin, 1_000_000);
        let token_client = token::TokenClient::new(&env, &token_address);
        let depositor_before = token_client.balance(&admin);
        let contract_before = token_client.balance(&client.address);

        client.deposit_revenue(&admin, &project_id, &5000, &100);

        let project = client.get_project(&project_id);
        assert!(project.reward_per_token_stored > 0);
        assert_eq!(project.total_energy_kwh, 100);

        assert_eq!(token_client.balance(&admin), depositor_before - 5000);
        assert_eq!(token_client.balance(&client.address), contract_before + 5000);
    }

    #[test]
    fn test_deposit_revenue_non_creator_panics() {
        let (env, admin, token_address, client) = setup();

        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );

        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &100);

        // buyer is not the project creator
        mint(&env, &token_address, &buyer, 1_000_000);
        assert_eq!(
            client.try_deposit_revenue(&buyer, &project_id, &5000, &100),
            Err(Ok(err(Error::NotCreator)))
        );
    }

    #[test]
    fn test_deposit_revenue_no_minted_panics() {
        let (env, admin, token_address, client) = setup();

        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );

        mint(&env, &token_address, &admin, 1_000_000);
        assert_eq!(
            client.try_deposit_revenue(&admin, &project_id, &5000, &100),
            Err(Ok(err(Error::NoTokensMinted)))
        );
    }

    #[test]
    fn test_claim_revenue() {
        let (env, admin, token_address, client) = setup();

        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );

        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &100);

        mint(&env, &token_address, &admin, 1_000_000);
        client.deposit_revenue(&admin, &project_id, &10000, &200);

        let claimable = client.get_claimable(&buyer, &project_id);
        assert!(claimable > 0);

        let token_client = token::TokenClient::new(&env, &token_address);
        let buyer_before = token_client.balance(&buyer);

        let claimed = client.claim_revenue(&buyer, &project_id);
        assert!(claimed > 0);
        assert_eq!(claimed, claimable);
        assert_eq!(token_client.balance(&buyer), buyer_before + claimed as i128);
    }

    /// Regression test: a buyer who purchases AFTER a revenue deposit has
    /// already happened must not be able to claim any share of that
    /// earlier deposit.
    #[test]
    fn test_late_buyer_gets_no_share_of_earlier_deposit() {
        let (env, admin, token_address, client) = setup();

        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );

        // Early buyer purchases first.
        let early_buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &early_buyer, 1_000_000);
        client.purchase_tokens(&early_buyer, &project_id, &100);

        // Revenue is deposited while only the early buyer holds tokens.
        mint(&env, &token_address, &admin, 1_000_000);
        client.deposit_revenue(&admin, &project_id, &10000, &200);

        // Late buyer purchases AFTER the deposit.
        let late_buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &late_buyer, 1_000_000);
        client.purchase_tokens(&late_buyer, &project_id, &100);

        // The late buyer must have zero claimable from the earlier deposit.
        let late_claimable = client.get_claimable(&late_buyer, &project_id);
        assert_eq!(late_claimable, 0);

        let late_claimed = client.claim_revenue(&late_buyer, &project_id);
        assert_eq!(late_claimed, 0);

        // The early buyer still gets their full share.
        let early_claimable = client.get_claimable(&early_buyer, &project_id);
        assert!(early_claimable > 0);
    }

    #[test]
    fn test_withdraw_sales() {
        let (env, admin, token_address, client) = setup();

        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );

        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &100);

        let sales_balance = client.get_sales_balance(&project_id);
        assert_eq!(sales_balance, 10000);

        let token_client = token::TokenClient::new(&env, &token_address);
        let admin_before = token_client.balance(&admin);

        client.withdraw_sales(&admin, &project_id, &5000);
        assert_eq!(client.get_sales_balance(&project_id), 5000);
        assert_eq!(token_client.balance(&admin), admin_before + 5000);
    }

    #[test]
    fn test_withdraw_sales_over_withdraw_panics() {
        let (env, admin, token_address, client) = setup();

        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );

        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &100);

        assert_eq!(
            client.try_withdraw_sales(&admin, &project_id, &999_999_999),
            Err(Ok(err(Error::InsufficientBalance)))
        );
    }

    #[test]
    fn test_user_projects() {
        let (env, admin, _token_address, client) = setup();

        client.create_project(
            &admin,
            &String::from_str(&env, "Solar Lima"),
            &1000,
            &100,
            &10,
        );
        client.create_project(
            &admin,
            &String::from_str(&env, "Solar Cusco"),
            &2000,
            &200,
            &20,
        );

        let projects = client.get_user_projects(&admin);
        assert_eq!(projects.len(), 2);
    }

    // ----------------------------------------
    // C-01: stable error codes
    // ----------------------------------------

    #[test]
    fn test_error_codes_are_stable() {
        assert_eq!(Error::NotAdmin as u32, 1);
        assert_eq!(Error::NotCreator as u32, 2);
        assert_eq!(Error::NotIssuer as u32, 3);
        assert_eq!(Error::NotParticipant as u32, 4);
        assert_eq!(Error::Paused as u32, 5);
        assert_eq!(Error::ProjectNotFound as u32, 6);
        assert_eq!(Error::ProjectInactive as u32, 7);
        assert_eq!(Error::InvalidAmount as u32, 8);
        assert_eq!(Error::BelowMinimum as u32, 9);
        assert_eq!(Error::InsufficientSupply as u32, 10);
        assert_eq!(Error::InsufficientBalance as u32, 11);
        assert_eq!(Error::NoTokensMinted as u32, 12);
        assert_eq!(Error::Overflow as u32, 13);
        assert_eq!(Error::RewardTooSmall as u32, 14);
    }

    // ----------------------------------------
    // C-02: admin functions
    // ----------------------------------------

    #[test]
    fn test_set_admin() {
        let (env, admin, _token_address, client) = setup();
        let new_admin = Address::generate(&env);

        client.set_admin(&admin, &new_admin);
        assert_eq!(client.get_admin(), new_admin);

        // The old admin lost its powers, the new one has them.
        assert_eq!(
            client.try_set_paused(&admin, &true),
            Err(Ok(err(Error::NotAdmin)))
        );
        client.set_paused(&new_admin, &true);
        assert!(client.is_paused());
    }

    #[test]
    fn test_set_admin_non_admin_rejected() {
        let (env, admin, _token_address, client) = setup();
        let stranger = Address::generate(&env);

        assert_eq!(
            client.try_set_admin(&stranger, &stranger),
            Err(Ok(err(Error::NotAdmin)))
        );
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    fn test_set_paused() {
        let (_env, admin, _token_address, client) = setup();

        assert!(!client.is_paused());
        client.set_paused(&admin, &true);
        assert!(client.is_paused());
        client.set_paused(&admin, &false);
        assert!(!client.is_paused());
    }

    #[test]
    fn test_set_paused_non_admin_rejected() {
        let (env, _admin, _token_address, client) = setup();
        let stranger = Address::generate(&env);

        assert_eq!(
            client.try_set_paused(&stranger, &true),
            Err(Ok(err(Error::NotAdmin)))
        );
        assert!(!client.is_paused());
    }

    #[test]
    fn test_set_issuer() {
        let (env, admin, _token_address, client) = setup();
        let account = Address::generate(&env);

        assert!(!client.is_issuer(&account));
        client.set_issuer(&admin, &account, &true);
        assert!(client.is_issuer(&account));

        let project_id = solar_lima(&env, &client, &account);
        assert_eq!(client.get_project(&project_id).creator, account);

        // Revoked: can no longer create projects.
        client.set_issuer(&admin, &account, &false);
        assert!(!client.is_issuer(&account));
        assert_eq!(
            client.try_create_project(
                &account,
                &String::from_str(&env, "Solar Tacna"),
                &1000,
                &100,
                &10
            ),
            Err(Ok(err(Error::NotIssuer)))
        );
    }

    #[test]
    fn test_set_issuer_non_admin_rejected() {
        let (env, _admin, _token_address, client) = setup();
        let stranger = Address::generate(&env);

        assert_eq!(
            client.try_set_issuer(&stranger, &stranger, &true),
            Err(Ok(err(Error::NotAdmin)))
        );
        assert!(!client.is_issuer(&stranger));
    }

    #[test]
    fn test_set_participant() {
        let (env, admin, token_address, client) = setup();
        let account = Address::generate(&env);
        let project_id = solar_lima(&env, &client, &admin);
        mint(&env, &token_address, &account, 1_000_000);
        mint(&env, &token_address, &admin, 1_000_000);

        assert!(!client.is_participant(&account));
        client.set_participant(&admin, &account, &true);
        assert!(client.is_participant(&account));

        client.purchase_tokens(&account, &project_id, &100);
        client.deposit_revenue(&admin, &project_id, &5_000, &0);

        // Revoked: no new purchases, but the existing position can still
        // be claimed (exits are always possible).
        client.set_participant(&admin, &account, &false);
        assert!(!client.is_participant(&account));
        assert_eq!(
            client.try_purchase_tokens(&account, &project_id, &10),
            Err(Ok(err(Error::NotParticipant)))
        );
        assert_eq!(client.claim_revenue(&account, &project_id), 5_000);
    }

    #[test]
    fn test_set_participant_non_admin_rejected() {
        let (env, _admin, _token_address, client) = setup();
        let stranger = Address::generate(&env);

        assert_eq!(
            client.try_set_participant(&stranger, &stranger, &true),
            Err(Ok(err(Error::NotAdmin)))
        );
        assert!(!client.is_participant(&stranger));
    }

    #[test]
    fn test_create_project_non_issuer_rejected() {
        let (env, _admin, _token_address, client) = setup();
        let stranger = Address::generate(&env);

        assert_eq!(
            client.try_create_project(
                &stranger,
                &String::from_str(&env, "Solar Lima"),
                &1000,
                &100,
                &10
            ),
            Err(Ok(err(Error::NotIssuer)))
        );
        assert_eq!(client.next_project_id(), 1);
    }

    #[test]
    fn test_purchase_non_participant_rejected() {
        let (env, admin, token_address, client) = setup();
        let project_id = solar_lima(&env, &client, &admin);

        // Funded but never approved by the admin.
        let stranger = Address::generate(&env);
        mint(&env, &token_address, &stranger, 1_000_000);

        assert_eq!(
            client.try_purchase_tokens(&stranger, &project_id, &100),
            Err(Ok(err(Error::NotParticipant)))
        );
        assert_eq!(client.get_project(&project_id).minted, 0);
    }

    /// I8: with the pause on, purchases and deposits revert, but claims and
    /// withdrawals keep working.
    #[test]
    fn test_pause_blocks_entries_but_never_exits() {
        let (env, admin, token_address, client) = setup();
        let token_client = token::TokenClient::new(&env, &token_address);
        let project_id = solar_lima(&env, &client, &admin);

        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        mint(&env, &token_address, &admin, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &100);
        client.deposit_revenue(&admin, &project_id, &10_000, &0);

        client.set_paused(&admin, &true);

        assert_eq!(
            client.try_purchase_tokens(&buyer, &project_id, &10),
            Err(Ok(err(Error::Paused)))
        );
        assert_eq!(
            client.try_deposit_revenue(&admin, &project_id, &1_000, &0),
            Err(Ok(err(Error::Paused)))
        );

        let buyer_before = token_client.balance(&buyer);
        assert_eq!(client.claim_revenue(&buyer, &project_id), 10_000);
        assert_eq!(token_client.balance(&buyer), buyer_before + 10_000);

        let admin_before = token_client.balance(&admin);
        client.withdraw_sales(&admin, &project_id, &10_000);
        assert_eq!(token_client.balance(&admin), admin_before + 10_000);

        // Unpausing reopens the entry points.
        client.set_paused(&admin, &false);
        client.purchase_tokens(&buyer, &project_id, &10);
        assert_eq!(client.get_project(&project_id).minted, 110);
    }

    #[test]
    fn test_transfer_ownership_requires_verified_issuer() {
        let (env, admin, _token_address, client) = setup();
        let project_id = solar_lima(&env, &client, &admin);

        let stranger = Address::generate(&env);
        assert_eq!(
            client.try_transfer_ownership(&admin, &project_id, &stranger),
            Err(Ok(err(Error::NotIssuer)))
        );

        let new_creator = issuer(&env, &admin, &client);
        client.transfer_ownership(&admin, &project_id, &new_creator);
        assert_eq!(client.get_project(&project_id).creator, new_creator);
        assert_eq!(client.get_user_projects(&admin).len(), 0);
        assert_eq!(client.get_user_projects(&new_creator).len(), 1);

        // The previous creator lost control of the project.
        assert_eq!(
            client.try_set_project_status(&admin, &project_id, &false),
            Err(Ok(err(Error::NotCreator)))
        );
    }

    /// Auth: every mutation demands the signature of the account it acts
    /// for. Passing someone else's address without their signature fails
    /// in the host auth check.
    #[test]
    fn test_mutations_require_signature() {
        let (env, admin, token_address, client) = setup();
        let project_id = solar_lima(&env, &client, &admin);
        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        mint(&env, &token_address, &admin, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &100);
        client.deposit_revenue(&admin, &project_id, &5_000, &0);

        // An admin call records exactly one authorization: the admin's.
        client.set_paused(&admin, &false);
        assert_eq!(
            env.auths(),
            std::vec![(
                admin.clone(),
                AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        client.address.clone(),
                        Symbol::new(&env, "set_paused"),
                        (admin.clone(), false).into_val(&env),
                    )),
                    sub_invocations: std::vec![],
                }
            )]
        );

        // From here on nobody signs anything.
        env.set_auths(&[]);
        let other = Address::generate(&env);
        assert_auth_rejected(client.try_set_admin(&admin, &other));
        assert_auth_rejected(client.try_set_paused(&admin, &true));
        assert_auth_rejected(client.try_set_issuer(&admin, &other, &true));
        assert_auth_rejected(client.try_set_participant(&admin, &other, &true));
        assert_auth_rejected(client.try_create_project(
            &admin,
            &String::from_str(&env, "Solar Puno"),
            &1000,
            &100,
            &10,
        ));
        assert_auth_rejected(client.try_purchase_tokens(&buyer, &project_id, &10));
        assert_auth_rejected(client.try_deposit_revenue(&admin, &project_id, &1_000, &0));
        assert_auth_rejected(client.try_update_energy(&admin, &project_id, &10));
        assert_auth_rejected(client.try_claim_revenue(&buyer, &project_id));
        assert_auth_rejected(client.try_withdraw_sales(&admin, &project_id, &1_000));
        assert_auth_rejected(client.try_set_project_status(&admin, &project_id, &false));
        assert_auth_rejected(client.try_transfer_ownership(&admin, &project_id, &admin));

        // Nothing changed.
        assert_eq!(client.get_admin(), admin);
        assert!(!client.is_paused());
        assert_eq!(client.get_claimable(&buyer, &project_id), 5_000);
        assert_eq!(client.get_sales_balance(&project_id), 10_000);

        // Control: the very same calls succeed once the signatures exist,
        // so the missing signature was the only reason they failed.
        env.mock_all_auths();
        client.set_paused(&admin, &true);
        assert!(client.is_paused());
        assert_eq!(client.claim_revenue(&buyer, &project_id), 5_000);
    }

    // ----------------------------------------
    // Error codes per function
    // ----------------------------------------

    #[test]
    fn test_create_project_invalid_params() {
        let (env, admin, _token_address, client) = setup();
        let name = String::from_str(&env, "Solar Lima");

        // (total_supply, price, min_purchase)
        for (supply, price, min) in [(0, 100, 1), (1000, 0, 10), (1000, 100, 0), (1000, 100, 1001)] {
            assert_eq!(
                client.try_create_project(&admin, &name, &supply, &price, &min),
                Err(Ok(err(Error::InvalidAmount)))
            );
        }
        assert_eq!(client.next_project_id(), 1);
    }

    #[test]
    fn test_purchase_errors() {
        let (env, admin, token_address, client) = setup();
        let project_id = solar_lima(&env, &client, &admin);
        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);

        assert_eq!(
            client.try_purchase_tokens(&buyer, &project_id, &9),
            Err(Ok(err(Error::BelowMinimum)))
        );
        assert_eq!(
            client.try_purchase_tokens(&buyer, &project_id, &0),
            Err(Ok(err(Error::BelowMinimum)))
        );
        assert_eq!(
            client.try_purchase_tokens(&buyer, &project_id, &1001),
            Err(Ok(err(Error::InsufficientSupply)))
        );

        client.set_project_status(&admin, &project_id, &false);
        assert_eq!(
            client.try_purchase_tokens(&buyer, &project_id, &10),
            Err(Ok(err(Error::ProjectInactive)))
        );

        // price * amount overflows u128.
        let huge = client.create_project(
            &admin,
            &String::from_str(&env, "Overflow"),
            &10,
            &u128::MAX,
            &1,
        );
        assert_eq!(
            client.try_purchase_tokens(&buyer, &huge, &2),
            Err(Ok(err(Error::Overflow)))
        );
        // price * amount does not fit the token's i128 amount.
        let wide = client.create_project(
            &admin,
            &String::from_str(&env, "Wide"),
            &10,
            &(i128::MAX as u128 + 1),
            &1,
        );
        assert_eq!(
            client.try_purchase_tokens(&buyer, &wide, &1),
            Err(Ok(err(Error::Overflow)))
        );
    }

    #[test]
    fn test_deposit_errors() {
        let (env, admin, token_address, client) = setup();
        let project_id = solar_lima(&env, &client, &admin);
        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        mint(&env, &token_address, &admin, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &100);

        assert_eq!(
            client.try_deposit_revenue(&admin, &project_id, &0, &0),
            Err(Ok(err(Error::InvalidAmount)))
        );
        assert_eq!(
            client.try_deposit_revenue(&admin, &project_id, &(i128::MAX as u128 + 1), &0),
            Err(Ok(err(Error::InvalidAmount)))
        );
        // amount * PRECISION overflows u128.
        assert_eq!(
            client.try_deposit_revenue(&admin, &project_id, &(u128::MAX / PRECISION + 1), &0),
            Err(Ok(err(Error::Overflow)))
        );

        client.set_project_status(&admin, &project_id, &false);
        assert_eq!(
            client.try_deposit_revenue(&admin, &project_id, &1_000, &0),
            Err(Ok(err(Error::ProjectInactive)))
        );
    }

    #[test]
    fn test_deposit_reward_too_small() {
        let (env, admin, token_address, client) = setup();
        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Micro"),
            &(2 * PRECISION),
            &1,
            &1,
        );
        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 2 * PRECISION as i128);
        mint(&env, &token_address, &admin, 1_000);

        // More than 1e18 shares minted: a 1-stroop deposit cannot move the
        // reward-per-token index.
        client.purchase_tokens(&buyer, &project_id, &(PRECISION + 1));
        assert_eq!(
            client.try_deposit_revenue(&admin, &project_id, &1, &0),
            Err(Ok(err(Error::RewardTooSmall)))
        );
    }

    #[test]
    fn test_creator_only_functions_reject_others() {
        let (env, admin, token_address, client) = setup();
        let project_id = solar_lima(&env, &client, &admin);
        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &100);

        let other_issuer = issuer(&env, &admin, &client);
        assert_eq!(
            client.try_update_energy(&buyer, &project_id, &10),
            Err(Ok(err(Error::NotCreator)))
        );
        assert_eq!(
            client.try_withdraw_sales(&buyer, &project_id, &1_000),
            Err(Ok(err(Error::NotCreator)))
        );
        assert_eq!(
            client.try_set_project_status(&buyer, &project_id, &false),
            Err(Ok(err(Error::NotCreator)))
        );
        assert_eq!(
            client.try_transfer_ownership(&other_issuer, &project_id, &other_issuer),
            Err(Ok(err(Error::NotCreator)))
        );
        assert_eq!(
            client.try_withdraw_sales(&admin, &project_id, &0),
            Err(Ok(err(Error::InvalidAmount)))
        );

        client.set_project_status(&admin, &project_id, &false);
        assert_eq!(
            client.try_update_energy(&admin, &project_id, &10),
            Err(Ok(err(Error::ProjectInactive)))
        );
    }

    #[test]
    fn test_unknown_project_errors() {
        let (env, admin, _token_address, client) = setup();
        let someone = Address::generate(&env);
        let not_found = Err(Ok(err(Error::ProjectNotFound)));

        assert_eq!(client.try_get_project(&7), Err(Ok(err(Error::ProjectNotFound))));
        assert_eq!(client.try_get_claimable(&someone, &7), Err(Ok(err(Error::ProjectNotFound))));
        assert_eq!(
            client.try_get_portfolio(&someone, &vec![&env, 7_u64]),
            Err(Ok(err(Error::ProjectNotFound)))
        );
        assert_eq!(client.try_claim_revenue(&someone, &7), Err(Ok(err(Error::ProjectNotFound))));
        assert_eq!(client.try_deposit_revenue(&admin, &7, &1, &0), not_found);
        assert_eq!(client.try_update_energy(&admin, &7, &1), not_found);
        assert_eq!(client.try_withdraw_sales(&admin, &7, &1), not_found);
        assert_eq!(client.try_set_project_status(&admin, &7, &false), not_found);
        assert_eq!(client.try_transfer_ownership(&admin, &7, &admin), not_found);
    }

    // ----------------------------------------
    // C-05: fixes
    // ----------------------------------------

    /// I10: sales are not revenue; `total_revenue` only counts deposits.
    #[test]
    fn test_total_revenue_counts_only_deposits() {
        let (env, admin, token_address, client) = setup();
        let project_id = solar_lima(&env, &client, &admin);
        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        mint(&env, &token_address, &admin, 1_000_000);

        client.purchase_tokens(&buyer, &project_id, &100);
        assert_eq!(client.get_project(&project_id).total_revenue, 0);
        assert_eq!(client.get_sales_balance(&project_id), 10_000);

        client.deposit_revenue(&admin, &project_id, &5_000, &0);
        assert_eq!(client.get_project(&project_id).total_revenue, 5_000);
    }

    /// `get_portfolio` used to report 0 when the accrual overflowed; now it
    /// fails with `Overflow`, like `get_claimable` and `claim_revenue`.
    #[test]
    fn test_get_portfolio_reports_overflow() {
        let (env, admin, token_address, client) = setup();
        let project_id = client.create_project(
            &admin,
            &String::from_str(&env, "Overflow"),
            &10,
            &1,
            &1,
        );
        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 10);
        client.purchase_tokens(&buyer, &project_id, &2);

        // Two deposits of 2e20 over 2 shares: reward_per_token = 2e38 still
        // fits in u128, but balance(2) * 2e38 does not.
        let deposit: u128 = 200_000_000_000_000_000_000;
        mint(&env, &token_address, &admin, 2 * deposit as i128);
        client.deposit_revenue(&admin, &project_id, &deposit, &0);
        client.deposit_revenue(&admin, &project_id, &deposit, &0);

        assert_eq!(
            client.try_get_portfolio(&buyer, &vec![&env, project_id]),
            Err(Ok(err(Error::Overflow)))
        );
        assert_eq!(
            client.try_get_claimable(&buyer, &project_id),
            Err(Ok(err(Error::Overflow)))
        );
        assert_eq!(
            client.try_claim_revenue(&buyer, &project_id),
            Err(Ok(err(Error::Overflow)))
        );
    }

    // ----------------------------------------
    // C-03: events
    // ----------------------------------------

    #[test]
    fn test_events_purchase_deposit_claim_kyc() {
        let (env, admin, token_address, client) = setup();
        let id = client.address.clone();
        let project_id = solar_lima(&env, &client, &admin);

        // kyc
        let buyer = Address::generate(&env);
        client.set_participant(&admin, &buyer, &true);
        let events = env.events().all().filter_by_contract(&id);
        assert_eq!(
            events,
            [ParticipantUpdated {
                account: buyer.clone(),
                approved: true
            }
            .to_xdr(&env, &id)]
        );
        // Wire format the indexer sees: topics ["kyc", account], data {approved}.
        assert_eq!(
            events,
            vec![
                &env,
                (
                    id.clone(),
                    (symbol_short!("kyc"), buyer.clone()).into_val(&env),
                    map![&env, (symbol_short!("approved"), val(&env, true))].to_val()
                )
            ]
        );

        // purchase
        mint(&env, &token_address, &buyer, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &50);
        let events = env.events().all().filter_by_contract(&id);
        assert_eq!(
            events,
            [TokensPurchased {
                project_id,
                buyer: buyer.clone(),
                amount: 50,
                total_price: 5_000
            }
            .to_xdr(&env, &id)]
        );
        // Wire format: topics ["purchase", project_id, buyer],
        // data {amount, total_price}.
        assert_eq!(
            events,
            vec![
                &env,
                (
                    id.clone(),
                    (symbol_short!("purchase"), project_id, buyer.clone()).into_val(&env),
                    map![
                        &env,
                        (symbol_short!("amount"), val(&env, 50_u128)),
                        (Symbol::new(&env, "total_price"), val(&env, 5_000_u128))
                    ]
                    .to_val()
                )
            ]
        );

        // deposit
        mint(&env, &token_address, &admin, 1_000_000);
        client.deposit_revenue(&admin, &project_id, &5_000, &120);
        assert_eq!(
            env.events().all().filter_by_contract(&id),
            [RevenueDeposited {
                project_id,
                amount: 5_000,
                energy_delta: 120
            }
            .to_xdr(&env, &id)]
        );

        // claim
        assert_eq!(client.claim_revenue(&buyer, &project_id), 5_000);
        assert_eq!(
            env.events().all().filter_by_contract(&id),
            [RevenueClaimed {
                project_id,
                investor: buyer.clone(),
                amount: 5_000
            }
            .to_xdr(&env, &id)]
        );

        // A zero claim changes nothing and publishes nothing.
        assert_eq!(client.claim_revenue(&buyer, &project_id), 0);
        assert!(env.events().all().filter_by_contract(&id).events().is_empty());
    }

    #[test]
    fn test_events_other_mutations() {
        let (env, admin, token_address, client) = setup();
        let id = client.address.clone();
        let ours = || env.events().all().filter_by_contract(&id);

        let other = Address::generate(&env);
        client.set_issuer(&admin, &other, &true);
        assert_eq!(
            ours(),
            [IssuerUpdated {
                account: other.clone(),
                verified: true
            }
            .to_xdr(&env, &id)]
        );

        let name = String::from_str(&env, "Solar Lima");
        let project_id = client.create_project(&admin, &name, &1000, &100, &10);
        assert_eq!(
            ours(),
            [ProjectCreated {
                project_id,
                creator: admin.clone(),
                name,
                supply: 1000,
                price: 100,
                min_purchase: 10
            }
            .to_xdr(&env, &id)]
        );

        client.update_energy(&admin, &project_id, &250);
        assert_eq!(
            ours(),
            [EnergyUpdated {
                project_id,
                energy_delta: 250,
                total: 250
            }
            .to_xdr(&env, &id)]
        );
        client.update_energy(&admin, &project_id, &50);
        assert_eq!(
            ours(),
            [EnergyUpdated {
                project_id,
                energy_delta: 50,
                total: 300
            }
            .to_xdr(&env, &id)]
        );

        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        client.purchase_tokens(&buyer, &project_id, &100);
        client.withdraw_sales(&admin, &project_id, &4_000);
        assert_eq!(
            ours(),
            [SalesWithdrawn {
                project_id,
                amount: 4_000
            }
            .to_xdr(&env, &id)]
        );

        client.set_project_status(&admin, &project_id, &false);
        assert_eq!(
            ours(),
            [ProjectStatusChanged {
                project_id,
                active: false
            }
            .to_xdr(&env, &id)]
        );

        client.transfer_ownership(&admin, &project_id, &other);
        assert_eq!(
            ours(),
            [OwnershipTransferred {
                project_id,
                new_creator: other.clone()
            }
            .to_xdr(&env, &id)]
        );

        client.set_paused(&admin, &true);
        assert_eq!(ours(), [PauseUpdated { paused: true }.to_xdr(&env, &id)]);

        let new_admin = Address::generate(&env);
        client.set_admin(&admin, &new_admin);
        assert_eq!(ours(), [AdminUpdated { new_admin }.to_xdr(&env, &id)]);
    }

    #[test]
    fn test_constructor_emits_admin_event() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let sac = env.register_stellar_asset_contract_v2(Address::generate(&env));
        let contract_id = env.register(NikoProject, (&admin, &sac.address()));

        assert_eq!(
            env.events().all().filter_by_contract(&contract_id),
            [AdminUpdated { new_admin: admin }.to_xdr(&env, &contract_id)]
        );
    }

    // ----------------------------------------
    // C-04: TTL
    // ----------------------------------------

    /// Every write re-extends the instance: age it below the threshold, run
    /// one mutation, and check the TTL is back at EXTEND_TO (>= THRESHOLD).
    #[test]
    fn test_instance_ttl_extended_on_every_write() {
        let (env, admin, token_address, client) = setup();
        let ttl = || env.as_contract(&client.address, || env.storage().instance().get_ttl());

        // The constructor already extended the instance.
        assert_eq!(ttl(), INSTANCE_TTL_EXTEND_TO);

        let other = Address::generate(&env);
        let buyer = participant(&env, &admin, &client);
        mint(&env, &token_address, &buyer, 1_000_000);
        mint(&env, &token_address, &admin, 1_000_000);
        let project_id = solar_lima(&env, &client, &admin);

        let aged_write = |write: &dyn Fn()| {
            env.ledger()
                .set_sequence_number(env.ledger().sequence() + 20_000);
            assert!(ttl() < INSTANCE_TTL_THRESHOLD);
            write();
            assert_eq!(ttl(), INSTANCE_TTL_EXTEND_TO);
            assert!(ttl() >= INSTANCE_TTL_THRESHOLD);
        };

        aged_write(&|| client.set_paused(&admin, &true));
        aged_write(&|| client.set_paused(&admin, &false));
        aged_write(&|| client.set_issuer(&admin, &other, &true));
        aged_write(&|| {
            participant(&env, &admin, &client);
        });
        aged_write(&|| {
            solar_lima(&env, &client, &admin);
        });
        aged_write(&|| client.purchase_tokens(&buyer, &project_id, &100));
        aged_write(&|| client.update_energy(&admin, &project_id, &10));
        aged_write(&|| client.deposit_revenue(&admin, &project_id, &5_000, &0));
        aged_write(&|| {
            client.claim_revenue(&buyer, &project_id);
        });
        aged_write(&|| client.withdraw_sales(&admin, &project_id, &1_000));
        aged_write(&|| client.set_project_status(&admin, &project_id, &false));
        aged_write(&|| client.transfer_ownership(&admin, &project_id, &other));
        aged_write(&|| client.set_admin(&admin, &other));
    }

    // ----------------------------------------
    // C-06: multi-participant invariant scenario
    // ----------------------------------------

    /// Running totals of every XLM flow the scenario performed.
    #[derive(Default)]
    struct Books {
        purchased: u128,
        withdrawn: u128,
        deposited: u128,
        claimed: u128,
    }

    /// Assert I1, I2, I3, I4 (with the real SAC balance), I6 and I10 for one
    /// project.
    fn assert_invariants(
        env: &Env,
        client: &NikoProjectClient,
        token_address: &Address,
        project_id: u64,
        investors: &[Address],
        books: &Books,
    ) {
        let project = client.get_project(&project_id);
        let mut sum_balance = 0_u128;
        let mut sum_claimable = 0_u128;
        let mut sum_claimed = 0_u128;
        for investor in investors {
            let position = client
                .get_portfolio(investor, &vec![env, project_id])
                .get(0)
                .unwrap();
            assert_eq!(
                position.claimable_amount,
                client.get_claimable(investor, &project_id)
            );
            sum_balance += position.token_balance;
            sum_claimable += position.claimable_amount;
            sum_claimed += position.total_claimed;
        }

        // I1: claimed + claimable never exceeds what was deposited.
        assert_eq!(sum_claimed, books.claimed);
        assert!(sum_claimed + sum_claimable <= books.deposited);

        // I2: minted never exceeds the supply and equals the holdings.
        assert!(project.minted <= project.total_supply);
        assert_eq!(project.minted, sum_balance);

        // I3: sales balance = purchases - withdrawals (>= 0).
        let sales = client.get_sales_balance(&project_id);
        assert_eq!(sales, books.purchased - books.withdrawn);
        assert_eq!(client.get_total_sales(), sales);

        // I4 (solvency) against the real SAC balance. The exact equality
        // also shows that only claims and withdrawals take XLM out (I6).
        let held = u128::try_from(
            token::TokenClient::new(env, token_address).balance(&client.address),
        )
        .unwrap();
        assert_eq!(
            held,
            books.purchased - books.withdrawn + books.deposited - books.claimed
        );
        assert!(held >= sales + sum_claimable);

        // I10: total_revenue counts deposits only.
        assert_eq!(project.total_revenue, books.deposited);
    }

    #[test]
    fn test_multi_participant_invariants() {
        let (env, admin, token_address, client) = setup();
        let token_client = token::TokenClient::new(&env, &token_address);

        // Separate roles: one verified issuer, three approved participants.
        let creator = issuer(&env, &admin, &client);
        let p1 = participant(&env, &admin, &client);
        let p2 = participant(&env, &admin, &client);
        let p3 = participant(&env, &admin, &client);
        for account in [&creator, &p1, &p2, &p3] {
            mint(&env, &token_address, account, 10_000_000);
        }
        let investors = [p1.clone(), p2.clone(), p3.clone()];

        let project_id = client.create_project(
            &creator,
            &String::from_str(&env, "Solar Arequipa"),
            &1_000,
            &100,
            &1,
        );
        let mut books = Books::default();
        let check = |books: &Books| {
            assert_invariants(&env, &client, &token_address, project_id, &investors, books)
        };
        check(&books);

        // 1. p1 buys 100 (10_000 stroops).
        client.purchase_tokens(&p1, &project_id, &100);
        books.purchased += 10_000;
        check(&books);

        // 2. Deposit 10_000 while p1 is the only holder.
        client.deposit_revenue(&creator, &project_id, &10_000, &50);
        books.deposited += 10_000;
        assert_eq!(client.get_claimable(&p1, &project_id), 10_000);
        check(&books);

        // 3. p2 buys 300 after that deposit: none of it is p2's (I7).
        client.purchase_tokens(&p2, &project_id, &300);
        books.purchased += 30_000;
        assert_eq!(client.get_claimable(&p2, &project_id), 0);
        assert_eq!(client.get_claimable(&p1, &project_id), 10_000);
        check(&books);

        // 4. Deposit 8_000 over 400 shares: p1 +2_000, p2 +6_000.
        client.deposit_revenue(&creator, &project_id, &8_000, &0);
        books.deposited += 8_000;
        assert_eq!(client.get_claimable(&p1, &project_id), 12_000);
        assert_eq!(client.get_claimable(&p2, &project_id), 6_000);
        check(&books);

        // 5. p1 claims everything; nothing left and no double claim (I9).
        let p1_before = token_client.balance(&p1);
        assert_eq!(client.claim_revenue(&p1, &project_id), 12_000);
        books.claimed += 12_000;
        assert_eq!(token_client.balance(&p1), p1_before + 12_000);
        assert_eq!(client.get_claimable(&p1, &project_id), 0);
        assert_eq!(client.claim_revenue(&p1, &project_id), 0);
        assert_eq!(token_client.balance(&p1), p1_before + 12_000);
        check(&books);

        // 6. p3 buys 200 (I7 again).
        client.purchase_tokens(&p3, &project_id, &200);
        books.purchased += 20_000;
        assert_eq!(client.get_claimable(&p3, &project_id), 0);
        check(&books);

        // 7. Deposit 7_000 over 600 shares: it does not divide evenly and
        //    flooring leaves 2 stroops of dust (I1 is <=, not ==).
        client.deposit_revenue(&creator, &project_id, &7_000, &0);
        books.deposited += 7_000;
        assert_eq!(client.get_claimable(&p1, &project_id), 1_166);
        assert_eq!(client.get_claimable(&p2, &project_id), 9_499);
        assert_eq!(client.get_claimable(&p3, &project_id), 2_333);
        check(&books);

        // 8. p1 buys 50 more: the 1_166 accrued is settled at the old
        //    balance and the new shares earn nothing retroactively (I7).
        client.purchase_tokens(&p1, &project_id, &50);
        books.purchased += 5_000;
        assert_eq!(client.get_claimable(&p1, &project_id), 1_166);
        check(&books);

        // 9. Deposit 1_300 over 650 shares (2 per share).
        client.deposit_revenue(&creator, &project_id, &1_300, &25);
        books.deposited += 1_300;
        assert_eq!(client.get_claimable(&p1, &project_id), 1_466);
        assert_eq!(client.get_claimable(&p2, &project_id), 10_099);
        assert_eq!(client.get_claimable(&p3, &project_id), 2_733);
        check(&books);

        // 10. p2 claims (p3 has still not claimed anything).
        assert_eq!(client.claim_revenue(&p2, &project_id), 10_099);
        books.claimed += 10_099;
        assert_eq!(client.get_claimable(&p2, &project_id), 0);
        check(&books);

        // 11. The creator withdraws part of the sales and cannot take more
        //     than what is left (I3).
        client.withdraw_sales(&creator, &project_id, &25_000);
        books.withdrawn += 25_000;
        assert_eq!(
            client.try_withdraw_sales(&creator, &project_id, &40_001),
            Err(Ok(err(Error::InsufficientBalance)))
        );
        check(&books);

        // 12. Supply cap (I2): 650 + 351 > 1_000 fails, 350 fills it exactly.
        assert_eq!(
            client.try_purchase_tokens(&p3, &project_id, &351),
            Err(Ok(err(Error::InsufficientSupply)))
        );
        client.purchase_tokens(&p3, &project_id, &350);
        books.purchased += 35_000;
        assert_eq!(client.get_project(&project_id).minted, 1_000);
        assert_eq!(
            client.try_purchase_tokens(&p1, &project_id, &1),
            Err(Ok(err(Error::InsufficientSupply)))
        );
        check(&books);

        // 13. Deposit 999 over 1_000 shares (0.999 per share, more dust).
        client.deposit_revenue(&creator, &project_id, &999, &0);
        books.deposited += 999;
        assert_eq!(client.get_claimable(&p1, &project_id), 1_615);
        assert_eq!(client.get_claimable(&p2, &project_id), 299);
        assert_eq!(client.get_claimable(&p3, &project_id), 3_282);
        check(&books);

        // 14. p1 and p3 claim; p2 leaves its 299 in the contract.
        assert_eq!(client.claim_revenue(&p1, &project_id), 1_615);
        books.claimed += 1_615;
        assert_eq!(client.claim_revenue(&p3, &project_id), 3_282);
        books.claimed += 3_282;
        check(&books);

        let project = client.get_project(&project_id);
        assert_eq!(project.total_revenue, 27_299);
        assert_eq!(project.total_energy_kwh, 75);
        assert_eq!(token_client.balance(&client.address), 75_303);
    }
}
