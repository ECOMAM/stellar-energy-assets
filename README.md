# NIKO SUN — Activos de energía solar en Stellar (RWA)

> Registro on-chain de proyectos de energía solar en Stellar/Soroban: participaciones internas no transferibles y reparto trazable de los ingresos de energía, bajo controles de cumplimiento.

**Construido para Stellar Odyssey Perú 2026** — Track 03: Real-World Assets & Compliant Rails

> **Aviso:** Demo en Stellar testnet con activos y datos simulados. Sin fondos reales. No es una oferta de inversión ni promete retornos.

## Índice

- [Problema](#problema)
- [Solución](#solución)
- [Cómo usa Stellar](#cómo-usa-stellar)
- [Arquitectura](#arquitectura)
- [Contrato](#contrato)
- [Evidencia on-chain](#evidencia-on-chain)
- [Cómo ejecutarlo](#cómo-ejecutarlo)
- [Qué se construyó durante la hackathon](#qué-se-construyó-durante-la-hackathon)
- [Proyecto base y procedencia](#proyecto-base-y-procedencia)
- [Créditos y licencias de terceros](#créditos-y-licencias-de-terceros)
- [Equipo](#equipo)
- [Videos](#videos)
- [Roadmap](#roadmap)
- [Licencia](#licencia)

## Problema

Un proyecto de energía solar necesita capital de terceros y, a la vez, una forma auditable de registrar cuánta energía produce y cómo se reparten sus ingresos entre quienes aportaron ese capital. Hacerlo de forma transparente y verificable en cadena, sin emitir un activo de libre circulación que choque con las restricciones regulatorias propias de un activo del mundo real (RWA), es el problema que aborda el track "Real-World Assets & Compliant Rails".

## Solución

NIKO SUN registra proyectos de energía solar en un contrato Soroban en Stellar:

- Emisores verificados por el administrador crean proyectos (`create_project`).
- Participantes aprobados por el administrador (KYC simulado para esta demo) pagan XLM real de testnet, a través del Stellar Asset Contract (SAC) nativo, para adquirir una participación interna **no transferible** en un proyecto (`purchase_tokens`).
- El emisor registra los ingresos de energía del proyecto (`deposit_revenue`) y estos se reparten de forma proporcional mediante un acumulador de tipo reward-per-token (precisión 1e18); cada participante reclama su parte cuando quiere, con un modelo pull (`claim_revenue`).
- La producción de energía (kWh) se ancla en cadena con `update_energy`.
- Controles de cumplimiento: emisores verificados, lista de participantes permitidos (allowlist) y una pausa global que bloquea el ingreso de nuevo XLM pero nunca bloquea reclamos ni retiros ya disponibles.
- Cada cambio de estado emite un evento, el TTL de la instancia se extiende en cada escritura, los errores del contrato están tipados y el contrato es inmutable (no existe función de actualización).

## Cómo usa Stellar

- El contrato corre en **Soroban**, la capa de contratos inteligentes de Stellar, con constructor `__constructor(admin, token)` siguiendo CAP-0058.
- Los pagos de los participantes se liquidan en **XLM real de testnet** a través del **Stellar Asset Contract (SAC)** nativo, no con una transferencia simulada.
- Cada operación la autoriza la cuenta que actúa, con la **autorización nativa de Soroban** (`require_auth`). El frontend firma con **Freighter**.
- Los controles de cumplimiento (emisores verificados, allowlist de participantes, pausa global) se aplican **dentro del contrato**, no solo en la interfaz.
- El contrato emite **eventos** en cada cambio de estado, y el indexador del frontend los consume con `getEvents` de Soroban RPC.
- El contrato extiende el **TTL** de su instancia y de su código en cada escritura (CAP-0053), para que no quede archivado mientras se usa.
- Los errores del contrato son **códigos tipados** (`#[contracterror]`) que el frontend traduce a mensajes.
- Las lecturas y el envío de operaciones usan **Soroban RPC** (`https://soroban-testnet.stellar.org`).
- Las participaciones internas que recibe cada participante **no son un activo SEP-41**: son saldos internos, no transferibles por diseño y sin mercado secundario. Es una decisión de diseño orientada a cumplimiento, no una limitación técnica de Stellar.

## Arquitectura

```
┌────────────────────────────────────────────────────────────────┐
│  Frontend — Next.js 15 (export estático, desplegado en Netlify) │
│  React 19 · @stellar/stellar-sdk 17 · Freighter (firma)         │
│  Lecturas on-chain en vivo, con etiquetas DEMO de respaldo       │
│  Indexador de holders a partir de eventos del contrato          │
│  Certificado en PDF con código QR (jsPDF + qrcode)               │
└───────────────────────────────┬──────────────────────────────────┘
                                 │ Soroban RPC
                                 │ https://soroban-testnet.stellar.org
┌───────────────────────────────▼──────────────────────────────────┐
│  Contrato — Rust + soroban-sdk 28 (target wasm32v1-none)          │
│  __constructor(admin, token) — CAP-0058                           │
│  Roles: admin · emisor · participante · vistas                    │
└───────────────────────────────┬──────────────────────────────────┘
                                 │
┌───────────────────────────────▼──────────────────────────────────┐
│  Stellar Testnet — Soroban + Stellar Asset Contract (XLM nativo)   │
└────────────────────────────────────────────────────────────────┘
```

## Contrato

Funciones públicas (v2), agrupadas por rol:

**Administrador**

| Función | Descripción |
|---|---|
| `set_admin` | Transferir el rol de administrador |
| `set_paused` | Activar o desactivar la pausa global |
| `set_issuer` | Aprobar o revocar una cuenta como emisor verificado |
| `set_participant` | Aprobar o revocar una cuenta en la lista de participantes permitidos |

**Emisor**

| Función | Descripción |
|---|---|
| `create_project` | Crear un nuevo proyecto solar |
| `deposit_revenue` | Registrar ingresos de energía del proyecto para repartir entre sus participantes |
| `update_energy` | Anclar en cadena la producción de energía (kWh) |
| `withdraw_sales` | Retirar el saldo de ventas disponible del proyecto |
| `set_project_status` | Cambiar el estado del proyecto |
| `transfer_ownership` | Transferir la titularidad del proyecto a otra cuenta emisora |

**Participante**

| Función | Descripción |
|---|---|
| `purchase_tokens` | Pagar XLM de testnet vía el SAC nativo para adquirir una participación interna no transferible |
| `claim_revenue` | Reclamar (modelo pull) la parte proporcional acumulada mediante el acumulador reward-per-token |

**Vistas**

| Función | Descripción |
|---|---|
| `get_project` | Obtener los datos de un proyecto |
| `get_claimable` | Consultar el monto reclamable de un participante en un proyecto |
| `get_portfolio` | Obtener las participaciones de una cuenta en los proyectos indicados |
| `get_sales_balance` | Consultar el saldo de ventas disponible para retirar |
| `get_user_projects` | Listar los proyectos asociados a una cuenta |
| `next_project_id` | Obtener el siguiente identificador de proyecto disponible |
| `get_total_sales` | Consultar el saldo de ventas pendiente de retiro, sumado entre todos los proyectos |
| `is_paused` | Consultar si el contrato está en pausa global |
| `is_issuer` | Consultar si una cuenta es un emisor verificado |
| `is_participant` | Consultar si una cuenta está en la lista de participantes permitidos |
| `get_admin` | Obtener la cuenta administradora actual |
| `get_token` | Obtener el contrato de token nativo (SAC) configurado |

**Invariantes y controles resumidos**

- Emisores verificados y participantes con allowlist administrada por el administrador (KYC simulado para esta demo).
- La pausa global bloquea el ingreso de nuevo XLM, pero nunca bloquea `claim_revenue` ni los retiros ya disponibles.
- Se emite un evento por cada cambio de estado.
- El TTL de la instancia se extiende en cada escritura.
- Errores de contrato tipados (`#[contracterror]`, códigos 1–15). "Saldo insuficiente" (`#11`, que también cubre la reserva mínima de la cuenta) y "supply agotado" (`#10`) se distinguen.
- Almacenamiento: cada dato por cuenta y por proyecto vive en su propia entrada persistente por clave. La instancia guarda solo configuración de tamaño fijo, así que el contrato no se degrada con la cantidad de participantes: se probó con 400 y la instancia se mantuvo en 308 bytes.
- Contrato inmutable: no existe función de actualización.
- Las participaciones no son tokens SEP-41: son saldos internos no transferibles por diseño, sin mercado secundario.

## Evidencia on-chain

### Contrato v2.1 (versión actual)

**Contract ID:** [`CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK`](https://stellar.expert/explorer/testnet/contract/CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK)

Ciclo completo ejecutado en testnet el 2026-09-24 con `scripts/demo-cycle.sh`:

| Paso | Transacción |
|---|---|
| Despliegue con constructor (wasm `3f86af78…`, commit `982b7f1`) | [`182e635db3f9…`](https://stellar.expert/explorer/testnet/tx/182e635db3f9e2285c7edae4abbf183a2c7a7bb41585d55319d1c22d68be20e9) |
| Emisor verificado (`set_issuer`) | [`c55cfc0754f0…`](https://stellar.expert/explorer/testnet/tx/c55cfc0754f0d65b8284e0188479f659464d2a43c63f5795a0a81b5cd181a531) |
| Participante aprobado (`set_participant`) | [`d00c017bc645…`](https://stellar.expert/explorer/testnet/tx/d00c017bc6454cd20c2cdb8b0ed5327c381a826e2a44cab2af1c174cec65ef00) |
| `create_project` | [`c5a18d0eaffb…`](https://stellar.expert/explorer/testnet/tx/c5a18d0eaffb1aafbde411fd501308e76817595b79915a671f1ba40072f7b0d2) |
| `purchase_tokens` (30 participaciones, 300 XLM) | [`7e09bac64934…`](https://stellar.expert/explorer/testnet/tx/7e09bac64934f7f130d0a200c28c2e62edd1e79053f4fde6cd765f9d11236e9f) |
| `update_energy` (+1250 kWh) | [`2a2e533a230f…`](https://stellar.expert/explorer/testnet/tx/2a2e533a230ff053924e041e254cf9dea6ca07debb230587922ff36ab510ffba) |
| `deposit_revenue` (40 XLM) | [`1493a38d874d…`](https://stellar.expert/explorer/testnet/tx/1493a38d874d96be33bb75a14fe0f47dc2f6eb0147f38a72e672d9af6f9eb0b7) |
| `claim_revenue` (30 XLM al participante 1) | [`f27deb604133…`](https://stellar.expert/explorer/testnet/tx/f27deb604133baf8584e1290007cffbe1d5920bcac6fa957c45d95dfd67363f1) |
| `withdraw_sales` (200 XLM al emisor) | [`19de8fbeec5b…`](https://stellar.expert/explorer/testnet/tx/19de8fbeec5b0073632a1fd9ebbb309f8d6d8351f559972bef9fd1c0624013ba) |
| `set_paused` (compra rechazada con `Paused #5` durante la pausa) | [`b0c1f2f68eda…`](https://stellar.expert/explorer/testnet/tx/b0c1f2f68eda442f9cc370e07c7e78f172aaaf87063057c634f52d797dc443b7) |

El detalle completo está en [`docs/ciclo-onchain-testnet.md`](docs/ciclo-onchain-testnet.md):
- todos los pasos;
- los efectos en Horizon que muestran el movimiento real de XLM;
- las correcciones de la revisión de seguridad verificadas on-chain (`#11` por saldo insuficiente, incluida la reserva mínima; `#15` por nombre inválido);
- los costos medidos por operación;
- el TTL del contrato (vivo hasta ≈ 2026-10-25);
- el historial de versiones. La revisión de seguridad está en [`docs/security-audit.md`](docs/security-audit.md).

La versión anterior, **v2** ([`CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM`](https://stellar.expert/explorer/testnet/contract/CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM)), completó el mismo ciclo. La v2.1 la reemplaza porque mueve el estado por cuenta a storage persistente por clave.

### Historial v1 (primera versión del contrato, solo contable, sin movimiento de XLM; se conserva por trazabilidad)

Contrato `CB7V3676CQBO5OL6DEXI5FORLG37IR2GR7LXCZD7DUZTMSUT7BEEINR3`, en [stellar.expert (testnet)](https://stellar.expert/explorer/testnet):

| Operación | Tx hash |
|---|---|
| Despliegue | [`825f5177550b3758815cf9584f8f91d3571030b78ebbafd112600368041d473c`](https://stellar.expert/explorer/testnet/tx/825f5177550b3758815cf9584f8f91d3571030b78ebbafd112600368041d473c) |
| `create_project` | [`403ea4811ee590761a460db1293d26aa664cd8c4be716c223a2fded25a60006a`](https://stellar.expert/explorer/testnet/tx/403ea4811ee590761a460db1293d26aa664cd8c4be716c223a2fded25a60006a) |
| `purchase_tokens` | [`283aaabcf8382e7445c9359960b24e8a9bb0ac50a567b719c246affcb903d600`](https://stellar.expert/explorer/testnet/tx/283aaabcf8382e7445c9359960b24e8a9bb0ac50a567b719c246affcb903d600) |

Los dos primeros despliegues en testnet del 19 de septiembre (2026-09-19) fueron `CDVT6PV536ALTEEXCAVWASGUOG5PHUJCA2WTVWYPZI5Z5KKTECCL6GY4` y el `CB7V3676CQBO5OL6DEXI5FORLG37IR2GR7LXCZD7DUZTMSUT7BEEINR3` listado arriba.

## Cómo ejecutarlo

### Requisitos

- Rust estable (el toolchain actual usado es Rust 1.98.1)
- Stellar CLI **28.0.0** — el primer contrato desplegado (`CB7V…`) se construyó con Stellar CLI 27; para builds reproducibles del contrato actual se requiere Stellar CLI 28.0.0
- Node.js 20+
- Freighter configurado en Testnet

### Contrato

```bash
rustup target add wasm32v1-none
cargo test
stellar contract build

# Despliegue en testnet
scripts/deploy.sh testnet
```

`scripts/deploy.sh` rechaza cualquier red distinta de testnet, firma usando el alias de keystore de la Stellar CLI definido en `DEPLOYER_ALIAS` (por defecto `niko-admin`, sin imprimir claves) y, para verificar el build reproducible, imprime el hash SHA-256 del wasm compilado.

Ciclo completo de demostración on-chain:

```bash
CONTRACT_ID=<id-del-contrato> LOG_FILE=docs/ciclo.md scripts/demo-cycle.sh
```

Este script aprueba a un emisor y a los participantes, crea un proyecto, ejecuta dos compras, actualiza la producción de energía, registra un ingreso, hace los reclamos correspondientes, ejecuta un retiro y verifica el comportamiento de la pausa.

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local
# Definir NEXT_PUBLIC_CONTRACT_ID en .env.local

npm run dev
npm test
npm run build
```

## Qué se construyó durante la hackathon

Ventana del evento: abrió el 2026-09-19 09:00 (hora de Perú). El primer commit de esta versión en Soroban es `afe35da` (2026-09-19 10:47 -06:00, Fernando May).

- **19-sep:** port a Soroban del contrato; frontend en Next.js; integración con Freighter; primeros despliegues en testnet (`CDVT6PV536ALTEEXCAVWASGUOG5PHUJCA2WTVWYPZI5Z5KKTECCL6GY4`, `CB7V3676CQBO5OL6DEXI5FORLG37IR2GR7LXCZD7DUZTMSUT7BEEINR3`); 40 pruebas de frontend.
- **20-sep:** contrato v2 con correcciones de auditoría y soroban-sdk 28; certificado en PDF con QR; integración con el dashboard.
- **21-sep:** liquidación real en XLM a través del SAC, constructor y permisos exclusivos para el creador del proyecto (Diego).
- **23-sep:** lecturas on-chain en vivo, indexador de holders, panel de verificación del protocolo y etiquetas DEMO honestas (Fernando).
- **24/25-sep:** integración de este código con su historial al repositorio de entrega; endurecimiento del contrato (controles de cumplimiento, eventos, TTL, errores tipados); nuevo despliegue en testnet y ciclo completo on-chain; se ajustó todo el copy de la aplicación para no usar lenguaje de productos financieros regulados; pruebas ejecutables y CI.

Este trabajo fue realizado por el equipo completo — ver [Equipo](#equipo).

## Proyecto base y procedencia

**Proyecto previo (declaración según regla 8.1).** NIKO SUN comenzó como un proyecto EVM (Solidity, ERC-1155), desarrollado por el integrante del equipo Diego Orrego (GitHub `AlesxanDer1102`) en la organización de GitHub `NIKOSUN-ORG`, en los repositorios `NIKO-SUN`, `niko-sun-frontend` y `backend-niko-sun`, entre noviembre de 2025 y enero de 2026.

Commit base declarado del proyecto previo: `NIKOSUN-ORG/NIKO-SUN@2783ac10a3e2` (2025-12-31).

La versión en Stellar/Soroban de este repositorio se escribió **dentro de la ventana del evento**:

- **Contrato**: port de la lógica de negocio del contrato EVM (`createProject`, `depositRevenue`, `claimRevenue`, `withdrawSales`, `updateEnergy`) de Solidity a Rust/Soroban, con un modelo propio de Stellar: pagos por el SAC, constructor, eventos, TTL y controles de cumplimiento.
- **Frontend**: es una implementación nueva para Stellar (Next.js 15 + Freighter + `@stellar/stellar-sdk`), distinta del frontend EVM original (Next.js 16 + RainbowKit/wagmi/viem).

El historial de esta versión Soroban comienza en el commit `afe35da` (2026-09-19 10:47 -06:00, Fernando May). La ventana del evento abrió el 2026-09-19 09:00 (hora de Perú).

Diego Orrego, autor del proyecto original, integra el equipo. <CONFIRMAR: autorizacion de Diego para reutilizar la logica bajo licencia MIT>

**Procedencia de este repositorio de entrega (declaración según regla 8.3).** Este repositorio de entrega es `ECOMAM/stellar-energy-assets`, el declarado en el checkpoint (commit inicial `62afbc5`). El código se incorporó **con su historial completo de git**, proveniente de:

- `FernandoMay/niko-sun-stellar@16cd9ec` (49 commits de Fernando May, entre 2026-09-19 y 2026-09-23), y
- su rama `feat/xlm-payments@754e971` (3 commits de Diego, del 2026-09-21: liquidación real en XLM a través del SAC más el constructor).

La integración y el endurecimiento del contrato se hicieron el 2026-09-24 y 2026-09-25 en la rama `integracion/niko-sun` (PR #1).

## Créditos y licencias de terceros

Declaración según regla 8.3. Versiones y licencias verificadas directamente en `package-lock.json` y en `node_modules/<paquete>/package.json` del frontend, y en el manifiesto de la crate `soroban-sdk` publicada en crates.io:

| Componente | Versión verificada | Licencia | Uso en este repositorio |
|---|---|---|---|
| soroban-sdk | 28.0.0 | Apache-2.0 | SDK del contrato (Rust) |
| @stellar/stellar-sdk | 17.1.0 | Apache-2.0 | Cliente Stellar/Soroban en el frontend |
| @stellar/freighter-api | 6.0.1 | Apache-2.0 | Firma de transacciones con Freighter |
| next | 15.5.25 | MIT | Framework del frontend (export estático) |
| react | 19.3.0 | MIT | Librería de interfaz |
| tailwindcss | 4.3.3 | MIT | Estilos |
| jspdf | 4.2.1 | MIT | Generación del certificado en PDF |
| qrcode | 1.5.4 | MIT | Código QR del certificado |

`lucide-react` estaba en la lista de candidatos a verificar, pero no aparece en `package-lock.json` ni en `node_modules` del frontend: no se usa en este repositorio.

Además:

- El diseño inicial del dashboard se generó con **v0.dev (Vercel)** y luego se adaptó manualmente.
- El patrón de acumulador de ingresos por token (reward-per-token) usado en el contrato está inspirado en el patrón popularizado por **Synthetix StakingRewards**: es un patrón de diseño de contratos, no código copiado.

## Equipo

| Integrante | GitHub | Rol |
|---|---|---|
| Mario | [@ECOMAM](https://github.com/ECOMAM) | `<ROL>` |
| Fernando May Fuentes | [@FernandoMay](https://github.com/FernandoMay) | `<ROL>` |
| Orlando Nahuel Vázquez González | [@orlando-vazquez-career](https://github.com/orlando-vazquez-career) | `<ROL>` |
| Diego Alesxander Orrego Torrejón | [@AlesxanDer1102](https://github.com/AlesxanDer1102) | `<ROL>` |

## Videos

- Demo: `<URL_VIDEO_DEMO>`
- Pitch: `<URL_VIDEO_PITCH>`
- Aplicación desplegada (opcional): `<URL_APP>`

## Roadmap

Planes a futuro; no son promesas ni compromisos:

- KYC real mediante SEP-12.
- Conversión a moneda fiat a través de anchors (SEP-24 / SEP-6).
- Almacenamiento persistente por cuenta (per-account storage).
- Oráculo de telemetría IoT firmada para la producción de energía.
- Una participación regulada y transferible (activo clásico con `AUTH_REQUIRED`/`AUTH_REVOCABLE` más un SAC), condicionada a que un regulador lo permita.

## Licencia

MIT — ver [`LICENSE`](./LICENSE) en la raíz del repositorio.
