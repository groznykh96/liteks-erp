export const ELEMENTS = ['C', 'Si', 'Mn', 'Cr', 'Ni', 'S', 'P', 'Cu', 'Ti', 'Al', 'Mg', 'Sr', 'Fe'] as const;
export type ElementSymbol = typeof ELEMENTS[number];

export interface Material {
    id: number;
    name: string;
    price: number;
    assimilation: number;
    [key: string]: string | number;
}

export interface Alloy {
    id: number;
    name: string;
    [key: string]: number | string | undefined;
}

export type Burnout = Record<ElementSymbol, number>;
export type Composition = Record<ElementSymbol, number>;

export function calculateChemistry(
    materials: Material[],
    masses: number[],
    burnout: Burnout
): Composition {
    let totalMass = masses.reduce((acc, m) => acc + m, 0);
    const result: Partial<Composition> = {};

    ELEMENTS.forEach(el => {
        let elTotal = 0;
        materials.forEach((mat, idx) => {
            elTotal += masses[idx] * (Number(mat[el]) || 0);
        });

        if (totalMass > 0) {
            result[el] = (elTotal * (100 - (burnout[el] || 0))) / (totalMass * 100);
        } else {
            result[el] = 0;
        }
    });

    return result as Composition;
}

export function runSolver(
    targetAlloy: Alloy,
    materials: Material[],
    burnout: Burnout
): number[] {
    if (!targetAlloy || materials.length === 0) return materials.map(() => 0);

    const targets: Record<string, number> = {};
    ELEMENTS.forEach(el => {
        const min = Number(targetAlloy[`${el}_min`]) || 0;
        const maxRaw = targetAlloy[`${el}_max`];
        const max = maxRaw != null ? Number(maxRaw) : min;
        const mid = maxRaw != null ? (min + max) / 2 : min;
        const b = burnout[el] || 0;
        targets[el] = (b < 100) ? mid * 100 / (100 - b) : mid;
    });

    let masses = new Array(materials.length).fill(0);

    const primarySources: Record<string, number> = {};
    ELEMENTS.forEach(el => {
        let maxContent = 0;
        let bestMatIdx = -1;
        materials.forEach((mat, idx) => {
            const val = Number(mat[el]) || 0;
            if (val > maxContent) {
                maxContent = val;
                bestMatIdx = idx;
            }
        });
        if (bestMatIdx !== -1 && maxContent > targets[el]) {
            primarySources[el] = bestMatIdx;
        }
    });

    let minAlloySum = Infinity;
    let baseIdx = 0;
    materials.forEach((mat, idx) => {
        let sum = 0;
        ELEMENTS.forEach(el => sum += Number(mat[el]) || 0);
        if (sum < minAlloySum) {
            minAlloySum = sum;
            baseIdx = idx;
        }
    });

    masses[baseIdx] = 100;

    for (let iter = 0; iter < 100; iter++) {
        let totalAmount = masses.reduce((acc, val) => acc + val, 0);
        if (totalAmount === 0) break;

        let amounts: Record<string, number> = {};
        ELEMENTS.forEach(el => amounts[el] = 0);

        materials.forEach((mat, idx) => {
            ELEMENTS.forEach(el => {
                amounts[el] += masses[idx] * ((Number(mat[el]) || 0) / 100);
            });
        });

        let maxErr = 0;

        ELEMENTS.forEach(el => {
            const currentPct = (amounts[el] / totalAmount) * 100;
            let err = targets[el] - currentPct;

            const b = burnout[el] || 0;
            const currentFinalPct = currentPct * ((100 - b) / 100);
            const maxRaw = targetAlloy[`${el}_max`];
            const tMax = maxRaw != null ? Number(maxRaw) : undefined;
            const tMin = Number(targetAlloy[`${el}_min`]) || 0;

            if (tMax !== undefined && currentFinalPct > tMax) {
                err = -Math.abs(currentFinalPct - tMax) * (100 / (100 - b)) * 2;
            }

            maxErr = Math.max(maxErr, Math.abs(err));

            if (Math.abs(err) > 0.01 && primarySources[el] !== undefined && primarySources[el] !== baseIdx) {
                const srcIdx = primarySources[el];
                const mat = materials[srcIdx];
                const contentDiff = (Number(mat[el]) || 0) - targets[el];

                if (Math.abs(contentDiff) > 0.5) {
                    let delta = (err * totalAmount) / contentDiff;

                    if (err < 0 && tMax !== undefined && currentFinalPct > tMax) {
                        delta *= 1.5;
                    } else if (err > 0 && currentFinalPct < tMin) {
                        delta *= 0.8;
                    } else {
                        delta *= 0.3;
                    }

                    masses[srcIdx] = Math.max(0, masses[srcIdx] + delta);
                }
            }
        });

        let sumOther = 0;
        masses.forEach((m, idx) => {
            if (idx !== baseIdx) sumOther += m;
        });
        masses[baseIdx] = Math.max(0, 100 - sumOther);

        if (maxErr < 0.05) break;
    }

    const finalTotal = masses.reduce((s, a) => s + a, 0);
    if (finalTotal > 0) {
        masses = masses.map(m => (m / finalTotal) * 100);
    } else {
        masses.fill(100 / materials.length);
    }

    return masses.map(m => Math.round(m * 100) / 100);
}
