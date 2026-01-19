export const GAME_RULES_TEXT = `
**Phase 1: The Fortification (Setup)**
- Each ruler is dealt 3 hidden cards (face-down) and 7 hand cards.
- You must select 3 of your strongest cards to place face-up on top of your hidden cards. This is your **Stronghold**.
- Once confirmed, the Skirmish begins with your remaining 4 cards.

**Phase 2: The Skirmish (Gameplay)**
- Rulers take turns playing cards that are **equal to or higher** than the top card of the pile.
- **Single Play:** You can play only one card per turn (unless playing a 2).
- **Auto-Refill:** If the deck has cards, you must always draw back up to a minimum of 3 cards in your hand after playing.
- **Failed Play:** If you cannot play a legal card, you must pick up the entire pile.

**Phase 3: The High Arcana (Power Cards)**
- **Rank 2 (The Reset):** Playable on anything. Resets the pile value and constraints (e.g., 7 then 2 then Ace is valid). You play again immediately.
- **Rank 7 (The Lowering):** The next ruler must play a card equal to or LOWER than 7.
- **Rank 10 (The Burn):** Playable on anything. Vaporizes the pile (removes it from game). Your turn ends immediately.
- **Rank Ace (The Swift):** The highest value standard card. Your turn ends immediately after playing.

**Phase 4: Coronation (Endgame)**
- Once the deck is empty and your hand is empty, you pick up your 3 **Stronghold** (face-up) cards.
- Once those are played, you must play your 3 **Blind Siege** (hidden) cards one by one without looking.
- If a blind card is illegal, you pick up the pile and must shed those cards before trying the next blind card.
- First to empty all 3 layers of cards wins the Throne.
`;

export const GEMINI_SYSTEM_INSTRUCTION = `
You are the Official Arbiter for "Palace Rulers", a tactical card game.
Your goal is to answer player questions about rules, edge cases, and strategy clearly.

OFFICIAL RULES:
${GAME_RULES_TEXT}

Tone: Authoritative, professional, slightly mystical. Keep responses concise.
`;

export const MOCK_PLAYER_NAMES = [
  "ShadowHunter", "CardShark99", "VelvetThunder", "PixelQueen", 
  "DriftKing", "MysticAura", "IronHand", "LuckyStar", 
  "NeonRider", "SilentWolf", "AceOfSpades", "RoyalGuard",
  "JokerWild", "CyberPunk", "NightOwl", "SolarFlare"
];