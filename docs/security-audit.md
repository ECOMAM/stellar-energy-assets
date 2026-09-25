# Revisión de seguridad del contrato

| | |
|---|---|
| Contrato | `niko_project` v2.2 (Soroban, Stellar testnet) |
| Contract ID | [`CCV6LA77VHMBTDP2RBIG5J5HULSKNSDB5FN5QYBIK3T5VRNPQFARAPAH`](https://stellar.expert/explorer/testnet/contract/CCV6LA77VHMBTDP2RBIG5J5HULSKNSDB5FN5QYBIK3T5VRNPQFARAPAH) |
| Wasm (sha256) | `98a32524fa336d2e1460a1b62931c6a92f66f0f74571c21f8f552c941109f630` |
| Fecha | 2026-09-25 |
| Alcance | solo red de pruebas (testnet); no hay fondos reales |
| Veredicto | **apto para testnet**: sin hallazgos abiertos |

La revisión es interna del equipo. La hizo un revisor con asistencia de IA, en un contexto independiente del que escribió el código. Tuvo tres rondas: v2, v2.1 y v2.2. No reemplaza una auditoría externa, que es requisito previo a cualquier despliegue en producción.

## Resumen

Se auditó el contrato Soroban que registra proyectos solares, vende participaciones internas no transferibles cobradas en XLM mediante el Stellar Asset Contract nativo y reparte los ingresos con el patrón reward-per-token.

Se revisaron:
- control de acceso;
- orden de efectos;
- aritmética;
- validación de entradas;
- pausa;
- eventos;
- almacenamiento y TTL;
- límites de recursos;
- reproducibilidad.

El binario desplegado se reprodujo bit a bit y su hash coincide con el registrado on-chain.

**v2 → v2.1.** El hallazgo principal de la v2 era de diseño: todo el estado vivía en una sola entrada de almacenamiento que crecía con cada cuenta. Con unos 300 participantes superaba el tamaño máximo por entrada de la red y el contrato quedaba inoperable, incluidos los retiros.

La v2.1 lo cierra. Cada dato por cuenta y por proyecto vive en su propia entrada persistente con renovación de TTL, y la entrada de configuración es de tamaño fijo: con 400 participantes se mantiene en 308 bytes. También se cerraron el código de error ambiguo por saldo insuficiente y el nombre de proyecto sin cota.

**v2.1 → v2.2.** Se cierran los dos hallazgos bajos que quedaban, sin cambiar la interfaz, los eventos ni los códigos de error:
- **Transferencia de titularidad**: ahora exige la firma del titular actual **y** la del nuevo. En una simulación on-chain con solo la firma del titular, el contrato rechaza la llamada por falta de autorización del receptor; la v2.1 la daba por buena.
- **Nombre del proyecto**: renueva su TTL junto con el proyecto en cada operación que lo escribe o lo lee. On-chain, las dos entradas del proyecto 1 viven hasta el mismo ledger (5 391 679). El costo agregado es una lectura por operación, entre 1,3 % y 2,2 % de la comisión de recursos.

No quedan hallazgos abiertos, y los aceptados no ponen fondos en riesgo.

## Hallazgos

| ID | Severidad | Estado | Hallazgo | Resolución |
|---|---|---|---|---|
| H-01 | alta | cerrada (v2.1) | Todo el estado por cuenta vivía en una sola entrada de instancia. Con ~300 participantes superaba el límite de la red y bloqueaba todas las funciones, incluidos reclamos y retiros. | Almacenamiento persistente por clave. Test de escala con 400 participantes: la instancia queda fija en 308 B. |
| H-02 | media | cerrada (v2.1) | El error de saldo del activo nativo (`#10`) coincidía con el código propio "supply agotado" (`#10`). | Chequeo de saldo antes de transferir y traducción del error del activo a `InsufficientBalance (#11)`, que también cubre la reserva mínima. Verificado on-chain. |
| H-03 | media | cerrada (v2.1) | El nombre de `create_project` no tenía cota: un nombre de 16 KB inflaba el estado. | `InvalidName (#15)` para nombres vacíos o de más de 64 bytes. Verificado on-chain. |
| H-04 | baja | aceptada | El redondeo del reparto deja polvo (unos pocos stroops) retenido en el contrato. | El redondeo favorece al contrato, no se puede extraer y queda documentado. |
| H-05 | baja | aceptada | `set_admin` es de un solo paso: una dirección errónea pierde el rol. | Reclamos y retiros no dependen del admin. Handover en dos pasos antes de producción. |
| H-06 | baja | cerrada | El frontend convertía con 10^6 en lugar de 10^7 stroops por XLM. | Helper único de unidades, con tests. |
| H-07 | baja | cerrada | El workflow de despliegue pasaba la clave como argumento de línea de comandos. | La clave se escribe en el keystore del CLI con `umask 077` y se firma con un alias. Permisos mínimos y borrado de la clave al terminar. |
| H-08 | baja | aceptada | `get_portfolio` no acota la cantidad de proyectos consultados: con los límites de red llega a unos 79 por llamada. | Es una vista de solo lectura. El frontend consulta en bloques de 12 y une los resultados. |
| H-09 | baja | cerrada (v2.2) | El nombre del proyecto no renovaba su TTL y se archivaba unos 31 días después de creado. | Se renueva junto con el proyecto en cada mutación. Verificado on-chain: `Name(1)` y `Project(1)` vencen en el mismo ledger. |
| H-10 | baja | cerrada (v2.2) | `transfer_ownership` no pedía la firma del receptor: otro emisor podía asignarle proyectos sin su consentimiento. | Doble firma: el titular actual y el nuevo. Verificado on-chain por simulación. Queda aceptado que la lista de proyectos de un emisor crezca solo por su propia actividad. |

## Cómo verificarlo

```bash
# Tests del contrato (51): escala con 400 participantes, invariantes contables,
# saldo insuficiente (#11), nombres (#15), TTL, eventos y doble firma en
# transfer_ownership
cargo test --locked

# Build reproducible: el sha256 debe coincidir con el wasm on-chain
stellar contract build            # Stellar CLI 28.0.0, Rust 1.98.1
sha256sum target/wasm32v1-none/release/niko_project.wasm
```

La evidencia on-chain (ciclo completo, efectos en Horizon, casos de error verificados, TTL y costos medidos) está en [`ciclo-onchain-testnet.md`](ciclo-onchain-testnet.md).
