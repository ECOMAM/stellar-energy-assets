# Ciclo on-chain de NIKO SUN (testnet)

- Contrato: [CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK](https://stellar.expert/explorer/testnet/contract/CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK)
- Fecha (UTC): 2026-09-24T23:19:35Z
- Admin: `GAU7FJEUIT7FSCFP6HSKMNQINO6XCVD5YSLS75CLT73AY4BUNFC5V76Y` · Emisor: `GBT4BD7AQ6VGUKNNO6GASY445IH6FCTG2GDH5U2ZRSFWIOX6K2TWASSG`
- Participante 1: `GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD` · Participante 2: `GAP552XX3ZGQ7EXSICT7PHVXTK43ZPNVJ6LJZ7HFSZYGNEHEUBM3ST46`

| Paso | Resultado | Transacción |
|---|---|---|
| Emisor verificado | `()` | [c55cfc0754f0](https://stellar.expert/explorer/testnet/tx/c55cfc0754f0d65b8284e0188479f659464d2a43c63f5795a0a81b5cd181a531) |
| Participante 1 aprobado | `()` | [d00c017bc645](https://stellar.expert/explorer/testnet/tx/d00c017bc6454cd20c2cdb8b0ed5327c381a826e2a44cab2af1c174cec65ef00) |
| Participante 2 aprobado | `()` | [5db328f8a8ae](https://stellar.expert/explorer/testnet/tx/5db328f8a8ae96e35d9ea4cda78cffd12e1c003e226dfecc6602898f6af531b7) |
| Proyecto creado | `1` | [c5a18d0eaffb](https://stellar.expert/explorer/testnet/tx/c5a18d0eaffb1aafbde411fd501308e76817595b79915a671f1ba40072f7b0d2) |
| Participante 1 adquiere 30 (300 XLM) | `()` | [7e09bac64934](https://stellar.expert/explorer/testnet/tx/7e09bac64934f7f130d0a200c28c2e62edd1e79053f4fde6cd765f9d11236e9f) |
| Participante 2 adquiere 10 (100 XLM) | `()` | [4639339928c1](https://stellar.expert/explorer/testnet/tx/4639339928c1d7c3feb3b49211452a6ed9b9868f7a6116bb671d62c3a0491f8b) |
| Energía registrada: +1250 kWh | `()` | [2a2e533a230f](https://stellar.expert/explorer/testnet/tx/2a2e533a230ff053924e041e254cf9dea6ca07debb230587922ff36ab510ffba) |
| Ingresos depositados: 40 XLM | `()` | [1493a38d874d](https://stellar.expert/explorer/testnet/tx/1493a38d874d96be33bb75a14fe0f47dc2f6eb0147f38a72e672d9af6f9eb0b7) |
| Participante 1 reclama su parte | `"300000000"` | [f27deb604133](https://stellar.expert/explorer/testnet/tx/f27deb604133baf8584e1290007cffbe1d5920bcac6fa957c45d95dfd67363f1) |
| Participante 2 reclama su parte | `"100000000"` | [8a175d4600fe](https://stellar.expert/explorer/testnet/tx/8a175d4600fe153f6ca6c4449f119d159f6920ed0952d6656adc585863a24ee4) |
| Emisor retira 200 XLM de ventas | `()` | [19de8fbeec5b](https://stellar.expert/explorer/testnet/tx/19de8fbeec5b0073632a1fd9ebbb309f8d6d8351f559972bef9fd1c0624013ba) |
| Pausa global activada | `()` | [b0c1f2f68eda](https://stellar.expert/explorer/testnet/tx/b0c1f2f68eda442f9cc370e07c7e78f172aaaf87063057c634f52d797dc443b7) |
| Compra durante la pausa | rechazada con `Paused (#5)` (simulación) | — |
| Pausa global desactivada | `()` | [4497d231e733](https://stellar.expert/explorer/testnet/tx/4497d231e733d23e6746ed28c97182748c1803690adf179813d5356437608776) |

Generado con `scripts/demo-cycle.sh` contra el contrato **v2.1**. Un corte de red con la RPC interrumpió la primera compra. Se comprobó por hash (`getTransaction`: NOT_FOUND) que no había entrado (`minted = 0`) y el ciclo se reanudó con `RESUME_PROJECT_ID=1 RESUME_STEP=purchase`.

## Despliegue (v2.1)

| Elemento | Valor |
|---|---|
| Contract ID | [`CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK`](https://stellar.expert/explorer/testnet/contract/CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK) |
| Subida del wasm | [`dcb0bc104293…`](https://stellar.expert/explorer/testnet/tx/dcb0bc10429346658590dda07d1141355aeed909db91d51aba1a61ea004654e2) |
| Despliegue (constructor) | [`182e635db3f9…`](https://stellar.expert/explorer/testnet/tx/182e635db3f9e2285c7edae4abbf183a2c7a7bb41585d55319d1c22d68be20e9) |
| Hash del wasm on-chain | `3f86af78640f26b516d39a12ce22d6e9770b9f7f8b2d3aff5911665b31f4816d` |
| Commit | `982b7f1`, compilado con `stellar contract build` (Stellar CLI 28.0.0, Rust 1.98.1) |
| Admin | `GAU7FJEUIT7FSCFP6HSKMNQINO6XCVD5YSLS75CLT73AY4BUNFC5V76Y` |
| Token de pago | SAC de XLM nativo `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

El hash del wasm desplegado coincide con el sha256 del build local de ese commit.

## El XLM se mueve de verdad (efectos en Horizon)

| Operación | Efectos |
|---|---|
| Participante 1 adquiere 30 ([`7e09bac6…`](https://horizon-testnet.stellar.org/transactions/7e09bac64934f7f130d0a200c28c2e62edd1e79053f4fde6cd765f9d11236e9f/effects)) | `account_debited` 300 XLM → `contract_credited` 300 XLM |
| Participante 1 reclama su parte ([`f27deb60…`](https://horizon-testnet.stellar.org/transactions/f27deb604133baf8584e1290007cffbe1d5920bcac6fa957c45d95dfd67363f1/effects)) | `contract_debited` 30 XLM → `account_credited` 30 XLM |

El reparto es proporcional. Con 40 participaciones emitidas (30 y 10) y 40 XLM de ingresos depositados, el contrato pagó **30 XLM** al participante 1 y **10 XLM** al participante 2.

## Correcciones de la revisión de seguridad, verificadas on-chain

Son simulaciones de solo lectura (`--send=no`) contra el contrato vivo. La cuenta de prueba tiene 10 000 XLM y está aprobada como participante ([`6eabefee…`](https://stellar.expert/explorer/testnet/tx/6eabefeef04e8d63a9bfcd824d0b904121c3669fa588a86a618b0e28cb31ba97)).

| Caso | Resultado |
|---|---|
| Compra de 10 000 XLM con saldo de exactamente 10 000 XLM (la reserva mínima impide gastarlo todo) | `Error(Contract, #11)` InsufficientBalance |
| Compra de 10 010 XLM con saldo de 10 000 XLM | `Error(Contract, #11)` InsufficientBalance |
| Compra por encima del supply disponible | `Error(Contract, #10)` InsufficientSupply |
| `create_project` con un nombre de 65 bytes | `Error(Contract, #15)` InvalidName |

"Sin saldo" y "sin supply" ya devuelven códigos distintos. El estado por cuenta vive en entradas persistentes por clave, así que la instancia del contrato no crece con la cantidad de participantes.

## Proyectos adicionales de la demo

| Proyecto | Creación | Actividad |
|---|---|---|
| #2 "Solar Lima Norte" (1500 × 10 XLM) | [`9958e66e…`](https://stellar.expert/explorer/testnet/tx/9958e66ecdc4c3577d9744ac88f4c6ef56ac8638cd4e40c5e194f76bccd71bc9) | compra de 45 ([`fc06e9ab…`](https://stellar.expert/explorer/testnet/tx/fc06e9abe7d61d8488c2877279bce4fe70eff62facbfeb04e9b1c70bd9203c51)); +2100 kWh ([`622149e0…`](https://stellar.expert/explorer/testnet/tx/622149e098095e55014c53c0a6764786e6e38faca776fa0fb571b679e2f3668f)) |
| #3 "Valle Sagrado Solar" (800 × 5 XLM) | [`92d03411…`](https://stellar.expert/explorer/testnet/tx/92d0341186d9010f88e598d2ed49f6a652dc207a30c371ca37c56aa0b861a083) | compra de 120 ([`b50c04d0…`](https://stellar.expert/explorer/testnet/tx/b50c04d074b26677e714b5169ae368eb012585378b67c226b03fd9d0959b501e)); +640 kWh ([`3e044395…`](https://stellar.expert/explorer/testnet/tx/3e0443954e95f1e065f3466cec11a1c5e0f412e8034f1d87c2320c559f7a506c)) |

## Costos medidos en testnet (fee cobrada, v2.1)

| Operación | Fee (XLM) |
|---|---|
| Aprobar emisor / participante (crea su entrada persistente) | 0.0201 – 0.0206 |
| `create_project` | 0.1144 |
| `purchase_tokens` (primera compra de la cuenta / siguientes) | 0.0958 / 0.0488 |
| `update_energy` | 0.0008 |
| `deposit_revenue` | 0.0018 |
| `claim_revenue` | 0.0248 |
| `withdraw_sales` | 0.0020 |
| `set_paused` | 0.0007 |

Las operaciones que crean una entrada nueva pagan su renta. A cambio, el costo por operación no crece con la cantidad de participantes: la compra número 400 cuesta lo mismo que la segunda.

## TTL

La instancia, el código y las entradas persistentes (por ejemplo `Project(1)`) quedan vivos hasta el ledger ≈ 5 389 360 (≈ 2026-10-25), según `getLedgerEntries`. Cada escritura los vuelve a extender unos 31 días.

## Historial de versiones del contrato en testnet

| Versión | Contract ID | Estado |
|---|---|---|
| v2.1 (actual) | `CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK` | storage persistente por clave; cierra los hallazgos de la revisión de seguridad |
| v2 | [`CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM`](https://stellar.expert/explorer/testnet/contract/CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM) | primer contrato con XLM real, cumplimiento, eventos y TTL. Ciclo completo: depósito [`f85d09eb…`](https://stellar.expert/explorer/testnet/tx/f85d09ebbaf5ca1c0454968035358a5728cc88d961806301a74ca7671b6c5a12) y reclamo [`e4b52a6d…`](https://stellar.expert/explorer/testnet/tx/e4b52a6d9b95181e37530695c03a4038100b0e9216ae123f8a1c336b2074851f). Reemplazado por v2.1 |
| v1 | `CB7V3676CQBO5OL6DEXI5FORLG37IR2GR7LXCZD7DUZTMSUT7BEEINR3` | solo contable, sin movimiento de XLM |
