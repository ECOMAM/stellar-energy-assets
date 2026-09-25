# Ciclo on-chain de NIKO SUN (testnet)

- Contrato: [CCV6LA77VHMBTDP2RBIG5J5HULSKNSDB5FN5QYBIK3T5VRNPQFARAPAH](https://stellar.expert/explorer/testnet/contract/CCV6LA77VHMBTDP2RBIG5J5HULSKNSDB5FN5QYBIK3T5VRNPQFARAPAH)
- Fecha (UTC): 2026-09-25T02:32:39Z
- Admin: `GAU7FJEUIT7FSCFP6HSKMNQINO6XCVD5YSLS75CLT73AY4BUNFC5V76Y` · Emisor: `GBT4BD7AQ6VGUKNNO6GASY445IH6FCTG2GDH5U2ZRSFWIOX6K2TWASSG`
- Participante 1: `GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD` · Participante 2: `GAP552XX3ZGQ7EXSICT7PHVXTK43ZPNVJ6LJZ7HFSZYGNEHEUBM3ST46`

| Paso | Resultado | Transacción |
|---|---|---|
| Emisor verificado | `()` | [3d6bf88fb72e](https://stellar.expert/explorer/testnet/tx/3d6bf88fb72ee130015f78712472311ee28fbcbba2edeebf26a106c7c3e69a8d) |
| Participante 1 aprobado | `()` | [919f0b125099](https://stellar.expert/explorer/testnet/tx/919f0b125099280bd09ea31d1269e2e29dc326dafb4812acbc5eccc24495e84e) |
| Participante 2 aprobado | `()` | [cd2424132e54](https://stellar.expert/explorer/testnet/tx/cd2424132e5467602cdce98ac1383737d9b6047b0343cafd0ed4673e5c50001c) |
| Proyecto creado | `1` | [5c8115e99352](https://stellar.expert/explorer/testnet/tx/5c8115e99352548b948a7502aad0b985542a80852eec1bdf9a98695712b7c12e) |
| Participante 1 adquiere 30 (300 XLM) | `()` | [affaeb9ceb99](https://stellar.expert/explorer/testnet/tx/affaeb9ceb99375bf55f6bcd694b7c0670fc87517b0befe0ee2f9013549d919d) |
| Participante 2 adquiere 10 (100 XLM) | `()` | [52c0c3355f89](https://stellar.expert/explorer/testnet/tx/52c0c3355f897c71f5aaec6d8e18b71427a57a10bc891f275d9206344b8d7ae3) |
| Energía registrada: +1250 kWh | `()` | [ada206fda7f1](https://stellar.expert/explorer/testnet/tx/ada206fda7f122227c0cf1aa222451e22ecd32f8e2afe85d6ee69c38587c1131) |
| Ingresos depositados: 40 XLM | `()` | [7e137bb743e1](https://stellar.expert/explorer/testnet/tx/7e137bb743e11a717dcdce8d95b2ed1d84e9dac10bed9fa99fdc46ab474acb4e) |
| Participante 1 reclama su parte | `"300000000"` | [1177e8a1499b](https://stellar.expert/explorer/testnet/tx/1177e8a1499b38cc9a4672733a59daaec49d9c4be3c9e997b45212b1e3f015aa) |
| Participante 2 reclama su parte | `"100000000"` | [bb873f0e4c54](https://stellar.expert/explorer/testnet/tx/bb873f0e4c545f495587e63d649e652ff48949e7e9e1c71fa92aec29de6392e2) |
| Emisor retira 200 XLM de ventas | `()` | [1ce7c4500429](https://stellar.expert/explorer/testnet/tx/1ce7c45004293c1eec8fff433fb49508c37fadf4c1fbb15ed218fc79877c746f) |
| Pausa global activada | `()` | [e66872aedbc1](https://stellar.expert/explorer/testnet/tx/e66872aedbc1cc3bcf3e01dec38b6aeb6ea67e230b50b36509cc950f660a7a09) |
| Compra durante la pausa | rechazada con `Paused (#5)` (simulación) | — |
| Pausa global desactivada | `()` | [4d9e926b9244](https://stellar.expert/explorer/testnet/tx/4d9e926b9244d67d81c326bfc6cdd2370adc415737d0839626de405001bf16f2) |

Generado con `scripts/demo-cycle.sh` contra el contrato **v2.2**.

## Despliegue (v2.2)

| Elemento | Valor |
|---|---|
| Contract ID | [`CCV6LA77VHMBTDP2RBIG5J5HULSKNSDB5FN5QYBIK3T5VRNPQFARAPAH`](https://stellar.expert/explorer/testnet/contract/CCV6LA77VHMBTDP2RBIG5J5HULSKNSDB5FN5QYBIK3T5VRNPQFARAPAH) |
| Subida del wasm | [`ebc13b721e6f…`](https://stellar.expert/explorer/testnet/tx/ebc13b721e6feb72ea458ecff2574d6a072de29f90035d6b0ba9723ed98edb6a) |
| Despliegue (constructor) | [`ba55f4d93ddc…`](https://stellar.expert/explorer/testnet/tx/ba55f4d93ddc5fc13dab571207069fd1193afafdda0c49daecc92e3bf6d58164), ledger 4 855 991 |
| Hash del wasm on-chain | `98a32524fa336d2e1460a1b62931c6a92f66f0f74571c21f8f552c941109f630` |
| Commit | `5a921f8`, compilado con `stellar contract build` (Stellar CLI 28.0.0, Rust 1.98.1) |
| Admin | `GAU7FJEUIT7FSCFP6HSKMNQINO6XCVD5YSLS75CLT73AY4BUNFC5V76Y` |
| Token de pago | SAC de XLM nativo `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

El hash del wasm desplegado coincide con el sha256 del build local de ese commit.

## El XLM se mueve de verdad (efectos en Horizon)

| Operación | Efectos |
|---|---|
| Participante 1 adquiere 30 ([`affaeb9c…`](https://horizon-testnet.stellar.org/transactions/affaeb9ceb99375bf55f6bcd694b7c0670fc87517b0befe0ee2f9013549d919d/effects)) | `account_debited` 300 XLM → `contract_credited` 300 XLM |
| Participante 1 reclama su parte ([`1177e8a1…`](https://horizon-testnet.stellar.org/transactions/1177e8a1499b38cc9a4672733a59daaec49d9c4be3c9e997b45212b1e3f015aa/effects)) | `contract_debited` 30 XLM → `account_credited` 30 XLM |

El reparto es proporcional. Con 40 participaciones emitidas (30 y 10) y 40 XLM de ingresos depositados, el contrato pagó **30 XLM** al participante 1 y **10 XLM** al participante 2.

## Correcciones de la revisión de seguridad, verificadas on-chain

Son simulaciones de solo lectura (`--send=no`) contra el contrato vivo. La cuenta de prueba tiene 10 000 XLM y está aprobada como participante ([`c5c8550a…`](https://stellar.expert/explorer/testnet/tx/c5c8550ace65b910df4b54f4ee50c217746dc1b904575435ad87e4a58fe45e27)).

| Caso | Resultado |
|---|---|
| Compra de 10 000 XLM con saldo de exactamente 10 000 XLM (la reserva mínima impide gastarlo todo) | `Error(Contract, #11)` InsufficientBalance |
| Compra de 10 010 XLM con saldo de 10 000 XLM | `Error(Contract, #11)` InsufficientBalance |
| Compra por encima del supply disponible | `Error(Contract, #10)` InsufficientSupply |
| `create_project` con un nombre de 65 bytes | `Error(Contract, #15)` InvalidName |
| TTL de `Name(1)` frente a `Project(1)` (`getLedgerEntries`) | los dos vencen en el ledger **5 391 679**: el nombre se renueva con el proyecto (v2.2) |

`transfer_ownership` exige ahora la firma del creador actual **y** la del nuevo creador. Lo cubren tests que fallan con la versión anterior y pasan con la v2.2.

## Proyectos adicionales de la demo

| Proyecto | Creación | Actividad |
|---|---|---|
| #2 "Solar Lima Norte" (1500 × 10 XLM) | [`5a8ec3c7…`](https://stellar.expert/explorer/testnet/tx/5a8ec3c7c837349476a1fb49dc9ce8c0208d928218353775b9149552af09e4d4) | compra de 45 ([`84627591…`](https://stellar.expert/explorer/testnet/tx/8462759129ca16c2137b813783f9c0a908e2f51c3d5c00363f36a3007bda70c5)); +2100 kWh ([`44eb5bbb…`](https://stellar.expert/explorer/testnet/tx/44eb5bbb7592295eb49dd54a912df7e1a759619122d81de28e329330c164e70d)) |
| #3 "Valle Sagrado Solar" (800 × 5 XLM) | [`7b977291…`](https://stellar.expert/explorer/testnet/tx/7b9772910dee914fa3bcebfc8eeda80d6b268e4f3b133d7d24184933a02e8464) | compra de 120 ([`da88b97f…`](https://stellar.expert/explorer/testnet/tx/da88b97f5ae5054d76ef3a4e17aa7e5e70a2d3bf85ae36d77d80d5ac1f887f4a)); +640 kWh ([`6a212159…`](https://stellar.expert/explorer/testnet/tx/6a212159860c7ead4601b41f1de9590501f129fc490949aa2ff00e892f36983a)) |

## Costos medidos en testnet (fee cobrada, v2.2)

| Operación | Fee (XLM) |
|---|---|
| Aprobar emisor / participante (crea su entrada persistente) | 0.0203 – 0.0209 |
| `create_project` | 0.1157 |
| `purchase_tokens` (primera compra de la cuenta / siguientes) | 0.0970 / 0.0496 |
| `update_energy` | 0.0009 |
| `deposit_revenue` | 0.0019 |
| `claim_revenue` | 0.0252 |
| `withdraw_sales` | 0.0020 |
| `set_paused` | 0.0007 |

Las operaciones que crean una entrada nueva pagan su renta. A cambio, el costo por operación no crece con la cantidad de participantes.

## TTL

La instancia y el código del contrato quedan vivos hasta el ledger 5 391 671, y `Project(1)` y `Name(1)` hasta el 5 391 679 (≈ 2026-10-26), según `getLedgerEntries`. Cada escritura los vuelve a extender unos 31 días.

## Historial de versiones del contrato en testnet

| Versión | Contract ID | Estado |
|---|---|---|
| v2.2 (actual) | `CCV6LA77VHMBTDP2RBIG5J5HULSKNSDB5FN5QYBIK3T5VRNPQFARAPAH` | `transfer_ownership` con doble firma y TTL del nombre renovado; cierra los hallazgos bajos de la revisión de seguridad |
| v2.1 | [`CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK`](https://stellar.expert/explorer/testnet/contract/CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK) | storage persistente por clave (cierra el hallazgo alto y los medios). Mismo ciclo completo: depósito [`1493a38d…`](https://stellar.expert/explorer/testnet/tx/1493a38d874d96be33bb75a14fe0f47dc2f6eb0147f38a72e672d9af6f9eb0b7) y reclamo [`f27deb60…`](https://stellar.expert/explorer/testnet/tx/f27deb604133baf8584e1290007cffbe1d5920bcac6fa957c45d95dfd67363f1) |
| v2 | [`CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM`](https://stellar.expert/explorer/testnet/contract/CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM) | primer contrato con XLM real, cumplimiento, eventos y TTL; el estado vivía en la instancia |
| v1 | `CB7V3676CQBO5OL6DEXI5FORLG37IR2GR7LXCZD7DUZTMSUT7BEEINR3` | solo contable, sin movimiento de XLM |
