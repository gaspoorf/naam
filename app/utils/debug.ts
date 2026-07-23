import type { FolderApi } from "tweakpane";

// ─── Types ────────────────────────────────────────────────────────────────────

type BaseBinding<T> = {
  label: string;
  value: T;
  onChange: (v: T) => void;
};

type ColorBinding = BaseBinding<string> & {
  type: "color";
};

type NumberBinding = BaseBinding<number> & {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
};

type BoolBinding = BaseBinding<boolean> & {
  type: "bool";
};

type ButtonBinding = {
  type: "button";
  label: string;
  onClick: () => void;
};

/** Vec3 : attend un objet { x, y, z } et appelle onChange(axis, value) par composante. */
type Vec3Binding = {
  type: "vec3";
  label: string;
  value: { x: number; y: number; z: number };
  params?: {
    x?: { min?: number; max?: number; step?: number };
    y?: { min?: number; max?: number; step?: number };
    z?: { min?: number; max?: number; step?: number };
  };
  onChange: (v: { x: number; y: number; z: number }) => void;
};

type Vec2Binding = {
  type: "vec2";
  label: string;
  value: { x: number; y: number };
  params?: {
    x?: { min?: number; max?: number; step?: number };
    y?: { min?: number; max?: number; step?: number };
  };
  onChange: (v: { x: number; y: number }) => void;
};

/** Select : liste de choix fixes. */
type SelectBinding<T extends string | number> = BaseBinding<T> & {
  type: "select";
  options: Record<string, T>;
};

export type DebugBinding =
  | ColorBinding
  | NumberBinding
  | BoolBinding
  | ButtonBinding
  | Vec3Binding
  | Vec2Binding
  | SelectBinding<string>
  | SelectBinding<number>;

// ─── addBinding ───────────────────────────────────────────────────────────────

/**
 * Ajoute un ou plusieurs contrôles TweakPane dans un folder.
 * Retourne un tableau de disposables — appelle `disposeBindings(result)` dans destroy().
 *
 * @example
 * const bindings = addBinding(folder, [
 *   { type: "color",  label: "Ambient",   value: "#fff",  onChange: v => ambient.color.set(v) },
 *   { type: "number", label: "Intensity", value: 0.4, min: 0, max: 5, onChange: v => { ambient.intensity = v } },
 *   { type: "vec3",   label: "Sun pos",   value: { x:3, y:8, z:3 }, min: -20, max: 20,
 *                     onChange: (axis, v) => sun.position[axis] = v },
 * ]);
 *
 * // Dans destroy() :
 * disposeBindings(bindings);
 */
export function addBinding(
  folder: FolderApi,
  descriptors: DebugBinding[],
): (() => void)[] {
  const disposables: (() => void)[] = [];

  for (const d of descriptors) {
    switch (d.type) {
      case "color": {
        // TweakPane gère les strings hex nativement
        const obj = { [d.label]: d.value };
        const binding = folder.addBinding(obj, d.label, { label: d.label });
        binding.on("change", ({ value }) => d.onChange(value));
        disposables.push(() => binding.dispose());
        break;
      }

      case "number": {
        const obj = { [d.label]: d.value };
        const binding = folder.addBinding(obj, d.label, {
          label: d.label,
          min: d.min,
          max: d.max,
          step: d.step,
        });
        binding.on("change", ({ value }) => d.onChange(value));
        disposables.push(() => binding.dispose());
        break;
      }

      case "bool": {
        const obj = { [d.label]: d.value };
        const binding = folder.addBinding(obj, d.label, { label: d.label });
        binding.on("change", ({ value }) => d.onChange(value));
        disposables.push(() => binding.dispose());
        break;
      }

      case "button": {
        const btn = folder.addButton({ title: d.label });
        btn.on("click", d.onClick);
        disposables.push(() => btn.dispose());
        break;
      }

      case "vec3": {
        const obj = { [d.label]: { ...d.value } };
        const binding = folder.addBinding(obj, d.label, {
          label: d.label,
          ...d.params,
        });
        binding.on("change", ({ value }) => d.onChange(value));
        disposables.push(() => binding.dispose());
        break;
      }

      case "vec2": {
        const obj = { [d.label]: { ...d.value } };
        const binding = folder.addBinding(obj, d.label, {
          label: d.label,
          ...d.params,
        });
        binding.on("change", ({ value }) => d.onChange(value));
        disposables.push(() => binding.dispose());
        break;
      }

      case "select": {
        const obj = { [d.label]: d.value };
        const binding = folder.addBinding(obj, d.label, {
          label: d.label,
          options: d.options,
        });
        binding.on("change", ({ value }) =>
          (d as SelectBinding<any>).onChange(value),
        );
        disposables.push(() => binding.dispose());
        break;
      }
    }
  }

  return disposables;
}

/**
 * Dispose tous les bindings retournés par addBinding().
 * Appelle cette fonction dans le destroy() de ta classe.
 */
export function disposeBindings(disposables: (() => void)[]) {
  disposables.forEach((fn) => fn());
}
