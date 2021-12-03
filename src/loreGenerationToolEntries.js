const entries = [
    {
        INPUT: `Rekheia is a fantasy world.`,
        OUTPUT: `[ Rekheia: a world of magic and monsters. Forged in war, it has entered an age of peace with the death of the last Titan. Much of Rekheia is temperate, though a tropical belt runs along the equator. The people of Rekheia are varied, enjoying the prosperity, though each nation prepares for the time peace once more combusts into war. ]`,
        KEYS: `rekheia, world, planet`,
    }, {
        INPUT: `White Lung (virus)`,
        OUTPUT: `[ White Lung: A highly infectious airborne virus that spreads rapidly through the air. Those infected develop symptoms within a few hours, and die within a week unless treated. Symptoms include fever, coughing up blood, and rapid breathing. White Lung is spread via respiratory droplets, and is extremely contagious. It's considered a pandemic by the UN. ]`,
        KEYS: `white lung, virus, infection`,
    }, {
        INPUT: ` A soldier who fights aliens.`,
        OUTPUT: `[ Cpl. Adam Sung: a veteran of many battles, he was captured by the alien invaders when they took over his home planet. He escaped their clutches on Earth, but only after being tortured to near-death. He's a grim-looking man, with short gray hair, steel-blue eyes, and scars criss-crossing his body. ]`,
        KEYS: `adam sung, cpl. sung`,
    }, {
        INPUT: `The Brightwater Event (meteor, detailed)`,
        OUTPUT: `[ Brightwater Event: At 3:07 AM of July 7th, 2058, meteor 2056 RJ1 impacted into Lake Michigan at 12% its original diameter of 0.216 km. Residual phosphorescent particles caused Lake Michigan to exhibit a strange green glow, which persisted for several weeks. Vials of "brightwater" from the event are still sold as a novelty item. ]`,
        KEYS: `brightwater, July 7th, 2056 RJ1`,
    }, {
        INPUT: `A card-based magic system.`,
        OUTPUT: `[ Taromancy: In Taromancy, cards are used as magical items or spell components. Cards can be created using special spells that allow one to draw from a deck of at least twenty-five cards. Each card represents a different spell, with some having multiple uses. There are also cards that have no rules associated with them, called "wild" cards. ]`,
        KEYS: `magic, card, taromancy`,
    }, {
        INPUT: `Form of alien poetry.`,
        OUTPUT: `[ S'Rian: Whilst not considered traditional poetry by some, S'Rian is a dialect spoken in syllabic form (using lines of six syllables), used to easily express complex concepts in a simple way. It often incorporates images and metaphors, and refers back to earlier verses. ]`,
        KEYS: `s'rian, alien poetry`,
    }, {
        INPUT: `A type of undead created by a fusion of death and fire.`,
        OUTPUT: `[ Ashwalker: These are creatures of corpses and ash. They possess the ability to breathe fire, making them formidable enemies. More than anything else, they are defined by their hunger. They consume all flora and fauna within reach, leaving nothing behind. To this end, they prefer areas where there is plenty of food available. ]`,
        KEYS: `ashwalker, flaming undead`,
    }, {
        INPUT: `MX-72A Automatic Railgun (basic)`,
        OUTPUT: `[ MX-72A Automatic Railgun: Known as "Mjolnir", the MX-72 Automatic Railgun fires metal slugs at supersonic speeds. ]`,
        KEYS: `mk-72a, automatic railgun, mjolnir`,
    }, {
        INPUT: `Maria is a dancer, but wants to be a pilot.`,
        OUTPUT: `[ Maria Smith: She's an aspiring dancer, but she'd rather be flying a jet instead. Her long black hair flows down her back, kept tied up in a ponytail most of the time. She has light brown skin, and dark green eyes, which give off a slightly melancholic vibe. On her shoulders is a tattoo of two small wings. She loves aviation for its freedom. ]`,
        KEYS: `maria, maria smith, dance`,
    }, {
        INPUT: `This alcoholic beverage resembles a bubbling green concoction, and is favored by the lizardfolk of the swamps. (basic)`,
        OUTPUT: `[ Jhargral: A sweet drink made from fermented fruit juice and honey. Its flavor is said to resemble that of a swampy bog. Lizardfolk favor this drink. ]`,
        KEYS: `swamp alcohol, jhargral, fermented fruit juice`,
    }, {
        INPUT: `Like a lion, but an insect.`,
        OUTPUT: `[ Scuttlebug: Though they resemble insectoid lions, these insects are actually quite different. While lions are predators, scuttlebugs are scavengers. Their bodies are covered in hard chitin plates, allowing them to withstand attacks from larger beings. ]`,
        KEYS: `lion bug, scuttlebug`,
    }, {
        INPUT: `Fleshsculptor Idrea`,
        OUTPUT: `[ Idrea the fleshsculptor: A skilled artist and sculptor, she spends her days crafting beautiful works of art out of human and monster parts. Despite being a woman of childbearing age, she has no interest in children, choosing instead to focus on creating works of beauty. She's tall and thin, with dark skin and red eyes. Critics cite the macabre nature of her works as "unsettling" and "immoral". ]`,
        KEYS: `idrea, fleshsculptor`,
    }, {
        INPUT: `"Harlequin" XF-8 (aircraft, detailed)`,
        OUTPUT: `[ The XF-6 "Harlequin" produced by Enway-Collins is a single seat fighter with a maximum speed of 467 km/h at sea level. With an armament of six .50 cal machine guns at 300 rounds and a Pratt & Whitney R-2800 radial engine with a two stage turbosupercharger, the Harlequin also saw service as an interceptor. Its all-metal construct allows it to endure speeds of up to 820 km/h in a dive, with a service ceiling of 8,500 meters with a maximum ceiling height of 9,500 meters. Its turn time with combat flaps was 24 seconds under 4,000 meters. Its climb rate was 15 meters per second under 3,000 meters and it slowed down to 13 meters per second up to 5,000 meters. ]`,
        KEYS: `harlequin, xf-6, enway-collins`,
    }, {
        INPUT: `Spot (John's dog)`,
        OUTPUT: `[ Spot: Beloved by his owner, Spot is John's friendly pomeranian. His fur is the color of caramel, with an eponymous chocolate-colored patch upon his back. Spot's interests include chasing ducks at the pond, barking at the mailman, and eating diced steak. His arch-nemesis is the neighbour's cat, Whiskers. ]`,
        KEYS: `spot, john's dog, pomeranian`,
    }, {
        INPUT: `"It's a kind of ritual performed by the Razavalki tribe. They say it connects them to the animal spirits, but it can be... eccentric."`,
        OUTPUT: `[ The Apex Dance: During the Apex Dance of the Razavalki tribe, the shaman performs pirouette motions while surrounded by a circle of fire. He wears a mask and a loincloth, and carries a bone staff. At a certain point in the ritual he will stop and make a sacrifice by throwing a piece of meat into a bonfire. Then, he continues dancing. This is done to summon the spirit of the predator that killed the sacrificed animal. It's said to be a powerful ritual, but one that can lead to madness if not done correctly. ]`,
        KEYS: `apex dance`,
    }, {
        INPUT: `Heinnman's Principle of Melodic Entropy`,
        OUTPUT: `[ Heinnman's Principle of Melodic Entropy: In music, the more a melody is repeated, the less interesting it becomes. This is due to a phenomenon called "melodic entropy", where the listener's ear is trained to perceive the melody as a whole, and thus become bored with its repetition. This term was coined by Theodore Heinnman, a musician who studied the effects of melodic entropy on listeners. ]`,
        KEYS: `heinnman's principle, melodic entropy`,
    }, {
        INPUT: `Ardentium (synthetic element, detailed)`,
        OUTPUT: `[ Ardentium: A synthetic element discovered in 2155. Its atomic number is 129, and it has a melting point of 1500.7°C. It's used to create alloys with high strength-to-weight ratios, and is sometimes found mixed with other elements in alloys with unusual properties. On its own, pure ardentium is a rust-red, brittle metal that's highly reactive to oxygen. ]`,
        KEYS: `ardentium, atomic number 129, element 129`,
    }, {
        INPUT: `Elective gavelkind corporatocracy (government type, basic)`,
        OUTPUT: `[ Elective Gavelkind Corporatocracy: A corporate government based around the gavelkind system. A board of directors elected by shareholders are entitled to vote for their preferred candidates, and may force a change in the board if the majority of the shareholders so desire. ]`,
        KEYS: `elective gavelkind corporatocracy`,
    }, {
        INPUT: `Jace Z (fantasy orc rapper)`,
        OUTPUT: `[ Jace Z: This orcish rapper is a member of the band "The Blackest Eyes". He's an aggressive, violent, and vulgar man, and is known for his many songs about alcohol, women, and violence. ]`,
        KEYS: `jace z, the blackest eyes`,
    }, {
        INPUT: `The Idolater is a fallen angel, seeking to usurp the heavenly realm in the name of the Vanished God (Apocraphes).`,
        OUTPUT: `[ The Idolater: When the Ascendant Library was opened to the seraphim, the Idolater stumbled upon knowledge of the Vanished God, Apocraphes. The Idolater sought to use his powers to return the Vanished God to the heavens, but was defeated. Now, he lies dormant, held captive by the Celestial Guard. ]`,
        KEYS: `idolater`,
    }, {
        INPUT: `Springtree Grotto (redwood misty location)`,
        OUTPUT: `[ Springtree Grotto: This grove is located in the northernmost reaches of the Great Forest, and is home to a myriad of trees. These include redwoods, firs, oaks, pines, maples, and cypresses. Though the trees grow large here, they're dwarfed by the immense size of the forest itself. Elk are common here, as are birds and mountain lions. ]`,
        KEYS: `springtree grotto`,
    }
]

module.exports = entries
