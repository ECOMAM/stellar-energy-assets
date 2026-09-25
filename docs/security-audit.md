# Revisión de seguridad del contrato

| | |
|---|---|
| Contrato | `niko_project` v2.1 (Soroban, Stellar testnet) |
| Contract ID | [`CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK`](https://stellar.expert/explorer/testnet/contract/CAFJK3XSGBJVOPIDPKJ7CCGNCGHFZOXA75HDQ372KDJSEKXVVPQ4EVQK) |
| Wasm (sha256) | `3f86af78640f26b516d39a12ce22d6e9770b9f7f8b2d3aff5911665b31f4816d` |
| Fecha | 2026-09-24 |
| Alcance | solo red de pruebas (testnet); no hay fondos reales |
| Veredicto | **apto para testnet**: sin hallazgos críticos, altos ni medios abiertos |

La revisión es interna del equipo. La hizo un revisor con asistencia de IA, en un contexto independiente del que escribió el código. No reemplaza una auditoría externa, que es requisito previo a cualquier despliegue en producción.

## Resumen

Se auditó la versión 2.1 del contrato Soroban que registra proyectos solares, vende participaciones internas no transferibles cobradas en XLM mediante el Stellar Asset Contract nativo y reparte los ingresos con el patrón reward-per-token.

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

El hallazgo principal de la versión 2 era de diseño: todo el estado vivía en una sola entrada de almacenamiento que crecía con cada cuenta. Con unos 300 participantes superaba el tamaño máximo por entrada de la red y el contrato quedaba inoperable, incluidos los retiros.

La versión 2.1 lo cierra. Cada dato por cuenta y por proyecto vive en su propia entrada persistente con renovación de TTL, y la entrada de configuración es de tamaño fijo. Con 400 participantes esa entrada se mantiene en 308 bytes, y la compra número 400 lee y escribe lo mismo que la segunda.

También quedaron cerrados el código de error ambiguo por saldo insuficiente y el nombre de proyecto sin cota. No quedan hallazgos críticos, altos ni medios abiertos, y ninguno de los pendientes pone fondos en riesgo.

## Hallazgos

| ID | Severidad | Estado | Hallazgo | Resolución |
|---|---|---|---|---|
| H-01 | alta | cerrada (v2.1) | Todo el estado por cuenta vivía en una sola entrada de instancia. Con ~300 participantes superaba el límite de la red y bloqueaba todas las funciones, incluidos reclamos y retiros. | Almacenamiento persistente por clave. Test de escala con 400 participantes: la instancia queda fija en 308 B. |
| H-02 | media | cerrada (v2.1) | El error de saldo del activo nativo (`#10`) coincidía con el código propio "supply agotado" (`#10`). | Chequeo de saldo antes de transferir y traducción del error del activo a `InsufficientBalance (#11)`, que también cubre la reserva mínima. Verificado on-chain. |
| H-03 | media | cerrada (v2.1) | El nombre de `create_project` no tenía cota: un nombre de 16 KB inflaba el estado. | `InvalidName (#15)` para nombres vacíos o de más de 64 bytes. Verificado on-chain. |
| H-04 | baja | aceptada | El redondeo del reparto deja polvo (unos pocos stroops) retenido en el contrato. | El redondeo favorece al contrato, no se puede extraer y queda documentado. |
| H-05 | baja | aceptada | `set_admin` es de un solo paso: una dirección errónea pierde el rol. | Reclamos y retiros no dependen del admin. Handover en dos pasos antes de producción. |
| H-06 | baja | cerrada | El frontend convertía con 10^6 en lugar de 10^7 stroops por XLM. | Helper único de unidades, con tests. |
| H-07 | baja | cerrada | El workflow de despliegue pasaba la clave como argumento de línea de comandos. | La clave se escribe en el keystore del CLI y se firma con un alias. Permisos mínimos y borrado de la clave al terminar. |
| H-08 | baja | aceptada | `get_portfolio` no acota la cantidad de proyectos consultados: con los límites de red llega a unos 79 por llamada. | Es una vista de solo lectura. El frontend consulta como máximo 12. |
| H-09 | baja | abierta | El nombre del proyecto no renueva su TTL y se archiva unos 31 días después de creado. | Restaurable, y la vista sigue funcionando por auto-restauración. Renovarlo en cada escritura del proyecto. |
| H-10 | baja | abierta | La lista de proyectos por emisor no tiene cota, y `transfer_ownership` no pide la firma del receptor. | No compromete fondos. Pedir la firma del nuevo titular y acotar la lista. |

## Cómo verificarlo

```bash
# Tests del contrato (47): escala con 400 participantes, invariantes contables,
# saldo insuficiente (#11), nombres (#15), TTL y eventos
cargo test --locked

# Build reproducible: el sha256 debe coincidir con el wasm on-chain
stellar contract build            # Stellar CLI 28.0.0, Rust 1.98.1
sha256sum target/wasm32v1-none/release/niko_project.wasm
```

La evidencia on-chain (ciclo completo, efectos en Horizon, casos de error verificados y costos medidos) está en [`ciclo-onchain-testnet.md`](ciclo-onchain-testnet.md).
