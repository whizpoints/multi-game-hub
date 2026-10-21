// Curated pool of 200+ realistic, modern, and diverse international player names
const REAL_PLAYER_NAMES = [
  "Liam", "Noah", "Oliver", "Emma", "Charlotte", "Amelia", "Sophia", "Isabella",
  "Lucas", "Mateo", "Carlos", "Kenji", "Hiroshi", "Maya", "Aisha", "Tariq",
  "Kwame", "Chloe", "Zara", "Elena", "David", "Priya", "Ethan", "Mei",
  "Daniel", "Amara", "Leo", "Gabriel", "Julian", "Marcus", "Viktor", "Nina",
  "Soren", "Freya", "Kai", "Anya", "Leila", "Sami", "Zayd", "Jamal",
  "Kofi", "Nia", "Fatima", "Rashid", "Ananya", "Rohan", "Arjun", "Dev",
  "Yuki", "Ren", "Takashi", "Hana", "Sakura", "Alex", "Ben", "Ryan",
  "Dylan", "Sam", "Jake", "Chris", "Tyler", "Nathan", "Brandon", "Justin",
  "Austin", "Jordan", "Cole", "Luke", "Owen", "Jack", "Max", "Mason",
  "Logan", "Connor", "Adam", "Evan", "Jason", "Aaron", "Sean", "Kyle",
  "Cameron", "Cody", "Eric", "Brett", "Trevor", "Seth", "Travis", "Jesse",
  "Derek", "Colin", "Damian", "Adrian", "Dominic", "Xavier", "Sebastian", "Tristan",
  "Oscar", "Felix", "Simon", "Hugo", "Jasper", "Arthur", "Theo", "Milo",
  "Tobias", "Axel", "Jonas", "Elias", "Anton", "Milan", "Rafael", "Dante",
  "Nico", "Diego", "Marco", "Thiago", "Leonardo", "Bruno", "Enzo", "Javier",
  "Emilio", "Alejandro", "Fernando", "Andres", "Rodrigo", "Gonzalo", "Valeria", "Camila",
  "Sofia", "Valentina", "Lucia", "Martina", "Natalia", "Gabriela", "Mariana", "Daniela",
  "Victoria", "Renata", "Ximena", "Luciana", "Andrea", "Paola", "Fernanda", "Carla",
  "Paula", "Alba", "Irene", "Julia", "Sara", "Carmen", "Maria", "Laura",
  "Marta", "Claudia", "Miriam", "Nuria", "Rania", "Yasmin", "Nadia", "Salma",
  "Lina", "Farah", "Dina", "Mariam", "Zeina", "Layla", "Noor", "Ines",
  "Youssef", "Karim", "Omar", "Hamza", "Ziad", "Tamer", "Bilal", "Faris",
  "Ali", "Malik", "Idris", "Kaelen", "Silas", "Rowan", "Ezra", "Asher",
  "Declan", "Finnegan", "Griffin", "Beckett", "Ronin", "Bodhi", "Sawyer", "Brooks",
  "Harrison", "Callum", "Jude", "Gideon", "Miles", "Jonah", "Micah", "Ezekiel",
  "Corbin", "Dorian", "Emerson", "Sterling", "Lennox", "Zane", "Cyrus", "Kieran"
];

function getRandomBotName(excludeNames = []) {
  const normalizedExclude = new Set(excludeNames.filter(Boolean).map(n => String(n).trim().toLowerCase()));
  const available = REAL_PLAYER_NAMES.filter(name => !normalizedExclude.has(name.toLowerCase()));
  const pool = available.length > 0 ? available : REAL_PLAYER_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
  REAL_PLAYER_NAMES,
  getRandomBotName
};
