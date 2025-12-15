export const GAME_RULES_TEXT = `
**Game Setup:**
- Each player starts with 3 hidden cards (face-down). They cannot look at these cards.
- Then each player is dealt 7 visible cards (hand cards).
- From these 7 cards, the player must select 3 cards and place them face-up on top of the 3 hidden cards.
- After placing these 3 cards, players play with their remaining hand cards. The game continues until the deck runs out.

**Card Hierarchy:**
- A > K > Q > J > all number cards
- Higher value beats lower value.
- Equal value is allowed (e.g., playing a 5 on a 5).

**Special Power Cards (Override Hierarchy):**
- **2 (Reset):** Acts as a reset. After someone plays a 2, the next player may throw any card.
- **7 (Lower):** The next card played must be lower than 7.
- **10 (Burn):** Burns the pile. The entire pile is removed from the game, and the next player starts fresh with any card.

**Basic Gameplay Rules:**
- Players throw cards onto a central pile in turns.
- You must throw a card equal to or higher than the top card—unless using a power card.
- If you cannot legally throw a card, you must pick up the entire pile.
- **Always Draw:** If the deck has cards, you must draw to maintain at least 3 cards in your hand after your turn.

**Using the Stacked Cards:**
- You may only use the 3 face-up cards on top of your hidden cards after your hand is reduced to 1 card.
- When you are left with only 1 card in your hand, you immediately pick up your 3 face-up cards and continue playing with them.
- Once all face-up cards are used, you must play the final 3 hidden cards, blindly, one by one.
- If a hidden card is unplayable, you must pick up the pile.

**Winning:**
- The first player to successfully play all cards (hand cards → face-up cards → hidden cards) wins the game.
`;

export const GEMINI_SYSTEM_INSTRUCTION = `
You are the Official Arbiter for a custom strategy card game called "Palace Rulers".
Your goal is to answer player questions about rules, edge cases, and scenarios clearly and authoritatively.

Here are the OFFICIAL RULES. Do not deviate from them. If a user asks about a rule not specified here, use your best judgment to suggest a fair "House Rule" consistent with the spirit of strategic shedding games (like Palace, Shithead, Karma), but explicitly state that it is a suggestion.

${GAME_RULES_TEXT}

Tone: Professional, impartial, slightly mystical (like a dungeon master or casino pit boss).
Format: Keep answers concise. Use bullet points for steps.
`;

export const MOCK_PLAYER_NAMES = [
  "ShadowHunter", "CardShark99", "VelvetThunder", "PixelQueen", 
  "DriftKing", "MysticAura", "IronHand", "LuckyStar", 
  "NeonRider", "SilentWolf", "AceOfSpades", "RoyalGuard",
  "JokerWild", "CyberPunk", "NightOwl", "SolarFlare"
];