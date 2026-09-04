// Phase 4 / micuenta — bookkeeping only: log the two §13 cases that do not apply to their tab (no browser).
import { logCase } from '../../support/phase4.ts';
logCase({ group: 'micuenta', screen: 'Mi Cuenta > Datos Personales', caseId: 'BT-06', instance: '#cpBody_Button1 (Guardar)', result: 'omitted', reason: 'not an icon-only button: value="Guardar" gives it an accessible name; icon-only controls of the shared chrome are covered under Shared chrome BT-06/AX-03 (SH-01, SH-02)' });
logCase({ group: 'micuenta', screen: 'Mi Cuenta > Dependientes', caseId: 'AX-03', instance: 'n/a', result: 'omitted', reason: 'no icon-only controls inside the tab (grid is empty, so no per-row Editar/Borrar icons rendered); shared-chrome icon controls covered under Shared chrome AX-03' });
