import type { SoundName } from "~/libs/experience/sounds";
import type { InteractionIconType } from "~/types/ui";

export const COLORS = {
  entityColor: "#a1d8c3",
  borealisColor: "#7fffd4",
  entityBlueColor: "#7fdbff",
  sketchColor: "#1d222c",
  s4godrayColor: "#729BA7",
};

type ChapterTexts = {
  title: string;
  infoInteractionIcon?: InteractionIconType;
  infoInteractionText?: string;
  popinText?: string;
  headerTitle?: string;
  interactionText: string[] | string;
  lastInteractionText?: string;
  entityVoices?: SoundName[];
};

export const CHAPTER1_TEXTS: ChapterTexts = {
  title: "L'appel",
  headerTitle: "I. L'appel",
  popinText:
    "Les éléments lumineux attirent votre regard... Cliquez pour révéler ce qu’ils cachent.",
  infoInteractionIcon: "move",
  infoInteractionText: `Cliquez sur les éléments luminescents pour interagir avec eux.`,
  interactionText: [
    '"Celui qui écoute la terre \nne marche jamais seul."',
    '"Cherche ce qui te regarde \ndans l\'ombre."',
  ],
  entityVoices: ["voice-1", "voice-2"],
};

export const CHAPTER2_TEXTS: ChapterTexts = {
  title: "HORIZ0N",
  headerTitle: "II. Horizon",
  popinText:
    "La pierre semble vous observer. Maintenez votre clic pour entrer en contact.",
  infoInteractionIcon: "hold",
  infoInteractionText: `Cherchez un signe de vie, restez appuyé dessus pour obtenir des informations.`,
  interactionText: `"Ta spirale n'est pas une blessure, c'est une porte.\nLe vent est la parole des anciens, la forêt en est le coeur."`,
  entityVoices: ["voice-6"],
};

export const CHAPTER3_TEXTS: ChapterTexts = {
  title: "Les Veilleurs",
  headerTitle: "III. Les veilleurs",
  popinText:
    "Certains regards se cachent dans la forêt... Cliquez dessus pour les éveiller.",
  infoInteractionIcon: "click",
  infoInteractionText: `Cliquez pour révéler les messages cachés...`,
  interactionText: [
    `"Tous ceux qui t'ont guidé ont \nun jour marché seuls."`,
    `"L'eau des rivières a porté des \nmilliers de reflets avant le tien."`,
    `"Tu n'étais pas destiné à suivre \nles autres. Différent, incompris, \ntu as été rejeté."`,
    `"Personne ne grandit en restant le même. \nParfois, il faut partir pour trouver son role."`,
    `"Marche Naam, ta place t'attend ailleurs..."`,
  ],
  entityVoices: ["voice-1", "voice-2", "voice-3", "voice-4", "voice-5"],
};

export const CHAPTER4_TEXTS: ChapterTexts = {
  title: "Symbiose",
  headerTitle: "IV. Symbiose",
  popinText: `Naam vous ressent. Maintenez appuyé sur la spirale pour poursuivre le rituel...`,
  infoInteractionIcon: "hold",
  infoInteractionText: `Cliquez et maintenez pour interagir avec Naam.`,
  interactionText: `"Bienvenue parmi nous, Naam.\nTu n'es plus seul maintenant."`,
  entityVoices: ["voice-7"],
};
