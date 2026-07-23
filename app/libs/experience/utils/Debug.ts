import { Pane } from "tweakpane";

/**
 * Classe Debug — wrapper TweakPane accessible via experience.debug.
 *
 * Usage :
 *   const folder = experience.debug.addFolder("💡 Lights – Scene 1");
 *   // puis utilise addBinding(folder, ...) pour y ajouter des contrôles
 *
 * Le pane est automatiquement caché en production (ou forcé visible via ?debug dans l'URL).
 */
export default class Debug {
  public readonly pane: Pane;
  public readonly active: boolean;

  constructor() {
    // this.active =
    //   import.meta.env.DEV || window.location.search.includes("debug");
    this.active = false;

    this.pane = new Pane({ title: "Debug", expanded: true });

    // put the pane in the top left corner, above the canvas
    this.pane.element.style.position = "fixed";
    this.pane.element.style.top = "10px";
    this.pane.element.style.left = "10px";
    this.pane.element.style.zIndex = "100";
    this.pane.element.style.width = "300px";

    if (!this.active) {
      this.pane.hidden = true;
    }

    addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.code === "KeyH") this.pane.hidden = !this.pane.hidden;
    });
  }

  /**
   * Crée un folder de premier niveau dans le pane.
   * Passe `expanded: false` pour le replier par défaut.
   */
  addFolder(title: string, expanded = true) {
    return this.pane.addFolder({ title, expanded });
  }

  destroy() {
    this.pane.dispose();
  }
}
