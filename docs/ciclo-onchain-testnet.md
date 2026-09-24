# Ciclo on-chain de NIKO SUN (testnet)

- Contrato: [CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM](https://stellar.expert/explorer/testnet/contract/CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM)
- Fecha (UTC): 2026-09-24T21:30:07Z
- Admin: `GAU7FJEUIT7FSCFP6HSKMNQINO6XCVD5YSLS75CLT73AY4BUNFC5V76Y` · Emisor: `GBT4BD7AQ6VGUKNNO6GASY445IH6FCTG2GDH5U2ZRSFWIOX6K2TWASSG`
- Participante 1: `GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD` · Participante 2: `GAP552XX3ZGQ7EXSICT7PHVXTK43ZPNVJ6LJZ7HFSZYGNEHEUBM3ST46`

| Paso | Resultado | Transacción |
|---|---|---|
| Emisor verificado | `()` | [6e752aead3d2](https://stellar.expert/explorer/testnet/tx/6e752aead3d20982c031f0710da9653a3342ce7d27df5249f6b6137cd151ccdd) |
| Participante 1 aprobado | `()` | [843d1f86906d](https://stellar.expert/explorer/testnet/tx/843d1f86906d7eecd003f8374962c0cc906f9ada7beea2b5fa0083ddc8952baa) |
| Participante 2 aprobado | `()` | [0412f8224804](https://stellar.expert/explorer/testnet/tx/0412f82248041db254e7856b9e22932faae9a34fabf34ebcaa915851be670d9c) |
| Proyecto creado | `1` | [994c660f64e8](https://stellar.expert/explorer/testnet/tx/994c660f64e8700488403f747e3f638d9400cd2e9e79f2b90c635b0a90557687) |
| Participante 1 adquiere 30 (300 XLM) | `()` | [d4fffe34dbf7](https://stellar.expert/explorer/testnet/tx/d4fffe34dbf7edb289fb4f68eec0d24f2c6704440fb34ad507e20b9e473f555e) |
| Participante 2 adquiere 10 (100 XLM) | `()` | [423d20a001d6](https://stellar.expert/explorer/testnet/tx/423d20a001d6f9b19d3fa990e63b71abbc62cc7540d69bfa619ec7ca52e3435f) |
| Energía registrada: +1250 kWh | `()` | [e81279ebb1b8](https://stellar.expert/explorer/testnet/tx/e81279ebb1b8d89a4f470ceb23e2ad118f2ae3a300e793224ec6d5c288ef5326) |
| Ingresos depositados: 40 XLM | `()` | [f85d09ebbaf5](https://stellar.expert/explorer/testnet/tx/f85d09ebbaf5ca1c0454968035358a5728cc88d961806301a74ca7671b6c5a12) |
| Participante 1 reclama su parte | `"300000000"` | [e4b52a6d9b95](https://stellar.expert/explorer/testnet/tx/e4b52a6d9b95181e37530695c03a4038100b0e9216ae123f8a1c336b2074851f) |
| Participante 2 reclama su parte | `"100000000"` | [935950e8f3aa](https://stellar.expert/explorer/testnet/tx/935950e8f3aac0b0a73a592a08afd56f8b8395a72d47486229c87bd00d4cc0c3) |
| Emisor retira 200 XLM de ventas | `()` | [c4b32d21c26c](https://stellar.expert/explorer/testnet/tx/c4b32d21c26ca439450cebb6494e9273418589fa09c6a29459fc0b97d333f9cc) |
| Pausa global activada | `()` | [e9726c60915b](https://stellar.expert/explorer/testnet/tx/e9726c60915b0893caf7867743add5f4b5a49314133e518a87f3b919667f5be7) |
| Compra durante la pausa | rechazada con `Paused (#5)` (simulación) | — |
| Pausa global desactivada | `()` | [44cb0e1ed57b](https://stellar.expert/explorer/testnet/tx/44cb0e1ed57b381ebd7d83b3afeac4289529e58c333f4966cf9aff22ec7c930b) |

Generado con `scripts/demo-cycle.sh`. La corrida se cortó una vez, después de registrar la energía, por un error de conexión con la RPC de testnet. Se comprobó on-chain que el depósito no había entrado (`total_revenue = 0`) y se reanudó con `RESUME_PROJECT_ID=1`, sin repetir aprobaciones ni compras.

## Despliegue

| Elemento | Valor |
|---|---|
| Contract ID | [`CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM`](https://stellar.expert/explorer/testnet/contract/CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM) |
| Subida del wasm | [`d9b51fa581ea…`](https://stellar.expert/explorer/testnet/tx/d9b51fa581eae3fbf86198b9457a8ce90202d042d54b5782c6730690c66138bc) |
| Despliegue (constructor) | [`55db825b600d…`](https://stellar.expert/explorer/testnet/tx/55db825b600da6acf3c6dbcd193f9a65dfab639671f655213dff62164efd084e) |
| Hash del wasm on-chain | `5ef31ba233f80060f841f9b90aab50a880c305f318c9b5e6328b6d81d78d6e8d` |
| Commit | `61b6ebe`, compilado con `stellar contract build` (Stellar CLI 28.0.0, Rust 1.98.1) |
| Admin | `GAU7FJEUIT7FSCFP6HSKMNQINO6XCVD5YSLS75CLT73AY4BUNFC5V76Y` |
| Token de pago | SAC de XLM nativo `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

El hash del wasm desplegado coincide con el sha256 de `target/wasm32v1-none/release/niko_project.wasm` compilado desde ese commit. Se puede reproducir con `stellar contract build`.

## El XLM se mueve de verdad (efectos en Horizon)

| Operación | Efectos |
|---|---|
| Participante 1 adquiere 30 ([`d4fffe34…`](https://horizon-testnet.stellar.org/transactions/d4fffe34dbf7edb289fb4f68eec0d24f2c6704440fb34ad507e20b9e473f555e/effects)) | `account_debited` 300 XLM → `contract_credited` 300 XLM (el contrato) |
| Participante 1 reclama su parte ([`e4b52a6d…`](https://horizon-testnet.stellar.org/transactions/e4b52a6d9b95181e37530695c03a4038100b0e9216ae123f8a1c336b2074851f/effects)) | `contract_debited` 30 XLM → `account_credited` 30 XLM |

El reparto es proporcional. Con 40 participaciones emitidas (30 y 10) y 40 XLM de ingresos depositados, el contrato calculó **30 XLM** para el participante 1 y **10 XLM** para el participante 2, y se pagaron exactamente esos montos.

## Costos medidos en testnet (fee cobrada)

| Operación | Fee (XLM) |
|---|---|
| Aprobar emisor / participante | 0.0008 – 0.0081 |
| `create_project` | 0.0892 |
| `purchase_tokens` (primera compra / siguientes) | 0.0731 / 0.0265 |
| `update_energy` | 0.0009 |
| `deposit_revenue` | 0.0019 |
| `claim_revenue` | 0.0141 – 0.0180 |
| `withdraw_sales` | 0.0018 |
| `set_paused` | 0.0009 |

Las operaciones que crean estado nuevo pagan más, por la renta del storage.

## TTL

La instancia y el código del contrato quedaron vivos hasta el ledger **5 388 016** (≈ 2026-10-25), según `getLedgerEntries`. Cada escritura los vuelve a extender unos 31 días.
