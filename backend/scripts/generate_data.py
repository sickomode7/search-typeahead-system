import csv
import random
import os

TITLES = [
    "elden ring", "red dead redemption 2", "minecraft", "cyberpunk 2077", "grand theft auto v",
    "the witcher 3", "stardew valley", "hollow knight", "terraria", "skyrim", "fortnite",
    "valorant", "apex legends", "league of legends", "overwatch 2", "call of duty warzone",
    "counter strike 2", "dota 2", "rocket league", "rainbow six siege", "rust", "ark survival ascended",
    "palworld", "helldivers 2", "lethal company", "baldurs gate 3", "genshin impact",
    "honkai star rail", "final fantasy xiv", "world of warcraft", "destiny 2", "warframe",
    "path of exile", "diablo 4", "fifa 24", "nba 2k24", "madden 24", "ea sports fc 24",
    "super mario bros wonder", "zelda tears of the kingdom", "mario kart 8 deluxe",
    "super smash bros ultimate", "animal crossing new horizons", "pokemon scarlet",
    "pokemon violet", "splatoon 3", "persona 5 royal", "persona 3 reload", "like a dragon infinite wealth",
    "yakuza 0", "street fighter 6", "tekken 8", "mortal kombat 1", "guilty gear strive",
    "granblue fantasy relink", "monster hunter world", "monster hunter rise", "dark souls 3",
    "bloodborne", "sekiro shadows die twice", "armored core 6", "lies of p", "lords of the fallen",
    "remnant 2", "hades", "hades 2", "dead cells", "slay the spire", "binding of isaac",
    "risk of rain 2", "vampire survivors", "brotato", "celeste", "outer wilds", "subnautica",
    "no mans sky", "kerbal space program", "factorio", "satisfactory", "rimworld", "cities skylines",
    "civilization 6", "crusader kings 3", "hearts of iron 4", "stellaris", "age of empires 2",
    "starcraft 2", "warcraft 3", "command and conquer", "halo infinite", "halo master chief collection",
    "gears 5", "forza horizon 5", "microsoft flight simulator", "sea of thieves", "grounded",
    "state of decay 2", "ori and the will of the wisps", "psychonauts 2", "god of war ragnarok",
    "spider man 2", "horizon forbidden west", "the last of us part 1", "the last of us part 2",
    "ghost of tsushima", "ratchet and clank rift apart", "returnal", "demon souls", "bloodborne",
    "uncharted 4", "infamous second son", "days gone", "death stranding", "detroit become human",
    "resident evil 4 remake", "resident evil village", "resident evil 2 remake", "resident evil 3 remake",
    "resident evil 7", "silent hill 2 remake", "dead space remake", "alan wake 2", "control",
    "quantum break", "max payne 3", "grand theft auto iv", "grand theft auto san andreas",
    "red dead redemption", "bully", "la noire", "midnight club 3", "bioshock infinite", "bioshock",
    "borderlands 3", "borderlands 2", "tiny tinas wonderlands", "mafia definitive edition",
    "xcom 2", "marvels midnight suns", "civilization 5", "assassins creed mirage", "assassins creed valhalla",
    "assassins creed odyssey", "assassins creed origins", "far cry 6", "far cry 5", "far cry 3",
    "rainbow six extraction", "ghost recon breakpoint", "ghost recon wildlands", "the division 2",
    "the crew motorfest", "watch dogs legion", "watch dogs 2", "splinter cell chaos theory",
    "prince of persia the lost crown", "rayman legends", "beyond good and evil", "doom eternal",
    "doom 2016", "wolfenstein 2", "dishonored 2", "dishonored", "prey", "deathloop", "fallout 4",
    "fallout new vegas", "fallout 76", "the elder scrolls online", "starfield", "hi fi rush",
    "the evil within 2", "rage 2", "quake champions", "hitman world of assassination", "hitman 3",
    "hitman 2", "hitman 2016", "hitman blood money", "tomb raider", "rise of the tomb raider",
    "shadow of the tomb raider", "deus ex mankind divided", "deus ex human revolution", "thief",
    "marvels avengers", "guardians of the galaxy", "sleeping dogs", "just cause 4", "just cause 3",
    "life is strange", "life is strange true colors", "nier automata", "nier replicant", "bayonetta 3",
    "astral chain", "the wonderful 101", "metal gear solid 5", "metal gear rising revengeance",
    "silent hill 3", "castlevania symphony of the night", "contra", "bomberman", "pac man", "galaga"
]

PREFIXES = [
    "best", "top", "new", "upcoming", "cheap", "free", "how to play", "games like", "similar to",
    "is it worth it", "is it good", "buy", "download"
]

SUFFIXES = [
    "review", "gameplay", "walkthrough", "guide", "wiki", "mods", "multiplayer", "coop", "splitscreen",
    "ps5", "xbox", "pc", "switch", "steam", "sale", "free", "speedrun", "tier list", "dlc", "update",
    "patch notes", "system requirements", "release date", "leak", "rumor", "news", "trailer", "ost",
    "soundtrack", "boss fight", "ending", "lore", "tips", "tricks", "build", "classes", "characters",
    "weapons", "armor", "map", "locations", "secrets", "easter eggs", "glitches", "speedrun world record",
    "vs", "or", "which is better"
]

GENRES = [
    "open world rpg", "fps multiplayer", "crafting survival", "turn based strategy", "mmo", "moba",
    "battle royale", "roguelike", "metroidvania", "platformer", "puzzle", "racing", "fighting",
    "sports", "simulation", "visual novel", "gacha", "rhythm", "sandbox", "tower defense"
]

PUBLISHERS = [
    "rockstar games", "fromsoft", "nintendo", "sony", "microsoft", "ea", "ubisoft", "activision",
    "blizzard", "square enix", "capcom", "sega", "bandai namco", "konami", "take two", "bethesda",
    "epic games", "valve", "riot games", "mihoyo"
]

def generate_query():
    # 50% chance just title
    # 20% chance title + suffix
    # 10% chance prefix + title
    # 10% chance prefix + title + suffix
    # 5% chance genre
    # 5% chance publisher
    r = random.random()
    if r < 0.5:
        return random.choice(TITLES)
    elif r < 0.7:
        return f"{random.choice(TITLES)} {random.choice(SUFFIXES)}"
    elif r < 0.8:
        return f"{random.choice(PREFIXES)} {random.choice(TITLES)}"
    elif r < 0.9:
        return f"{random.choice(PREFIXES)} {random.choice(TITLES)} {random.choice(SUFFIXES)}"
    elif r < 0.95:
        return f"{random.choice(GENRES)} {random.choice(['games', 'pc', 'ps5', 'switch', '2024', 'best'])}"
    else:
        return f"{random.choice(PUBLISHERS)} {random.choice(['games', 'new game', 'sale', 'launcher', 'account'])}"

def main():
    TARGET_ROWS = 120000
    DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(DATA_DIR, exist_ok=True)
    OUTPUT_FILE = os.path.join(DATA_DIR, 'queries.csv')
    
    unique_queries = set()
    print("Generating unique queries...")
    while len(unique_queries) < TARGET_ROWS:
        unique_queries.add(generate_query())
        
    # We want a Pareto distribution for counts. Few queries have high counts, many have low counts.
    # We will use random.paretovariate to generate counts.
    queries_list = list(unique_queries)
    # Shuffle so that the base titles aren't necessarily the only ones with high counts, 
    # though practically we'd want base titles to be higher.
    # To make it realistic, let's sort by length or just let it be random pareto.
    
    # We'll boost base titles slightly by assigning them from the higher end of the sorted pareto
    # But for simplicity, let's just generate N pareto numbers, sort them descending, and assign them
    # semi-randomly, perhaps giving higher counts to shorter queries or just base titles.
    print("Generating counts...")
    counts = [int(random.paretovariate(1.1) * 100) for _ in range(TARGET_ROWS)]
    counts.sort(reverse=True)
    
    # Ensure min count is at least 1
    counts = [max(1, c) for c in counts]
    
    # Let's assign higher counts to base titles.
    # Sort queries so that base titles come first.
    def score(q):
        if q in TITLES:
            return 1000 + random.random()
        return random.random()
    
    queries_list.sort(key=score, reverse=True)
    
    # Combine query and count
    records = list(zip(queries_list, counts))
    
    # Shuffle records so the CSV isn't perfectly sorted (to test sorting on load)
    random.shuffle(records)
    
    print(f"Writing to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['query', 'count'])
        for q, c in records:
            writer.writerow([q, c])
            
    print(f"Successfully generated {TARGET_ROWS} rows in {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
