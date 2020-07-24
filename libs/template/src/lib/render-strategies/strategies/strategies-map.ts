import {
  RenderStrategy,
  RenderStrategyFactoryConfig
} from '../../core/render-aware';
import { createNoopStrategy } from './noop.strategy';
import { createNativeStrategy } from './native.strategy';
import { getLocalStrategies } from './local.strategy';
import { getGlobalStrategies } from './global.strategy';
import { getExperimentalLocalStrategies } from '../../experimental/render-strategies/strategies';

export const DEFAULT_STRATEGY_NAME = 'local';

export function getStrategies(
  config: RenderStrategyFactoryConfig
): { [strategy: string]: RenderStrategy } {
  return {
    noop: createNoopStrategy(),
    native: createNativeStrategy(config),
    ...getGlobalStrategies(config),
    ...getLocalStrategies(config),
    ...getExperimentalLocalStrategies(config)
  };
}

/**
 * Strategies
 *
 * - mFC - `cdRef.markForCheck`
 * - dC - `cdRef.detectChanges`
 * - ɵMD - `ɵmarkDirty`
 * - ɵDC - `ɵdetectChanges`
 * - C - `Component`
 * - det - `cdRef.detach`
 * - ret - `cdRef.reattach`
 * - Pr - `Promise`
 * - aF - `requestAnimationFrame`
 *
 * | Name        | ZoneLess | Render Method | ScopedCoalescing | Scheduling | Chunked |
 * |-------------| ---------| --------------| ---------------- | ---------- |-------- |
 * | `noop`      | ❌       | ❌             | ❌               | ❌         | ❌       |
 * | `native`    | ❌       | mFC           | ❌                | ❌         | ❌      |
 * | `global`    | ✔        | ɵMD           | C + Pr           | ❌         | ❌      |
 * | `local`     | ✔        | ɵDC           | C + Pr           | aF         | ❌      |
 * | `detach`    | ✔ ️     | ret,ɵDC, det  | C + Pr           | aF         | ❌      |
 */
