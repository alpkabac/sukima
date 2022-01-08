# Generators Explained

Generators are a notion inherited from AIDungeon's "evalbots"  
They are prompts that are executed before or after the actual AI story generation, allowing to do useful things to
either the input or the output  
Fundamentally, generators here are a tool to build a prompt using several examples

## What are they for?

Generators can do a lot of useful things, from format conversion to data extraction, or plain item generation  
Below is a non-exhaustive list of things they can do:

- Convert data format:
    - transform JSON from or into YAML
    - transform `[ Character: Alice; gender: female; age:23; personality: joyful, curious ]`
      into `Alice is a young joyful and curious adult` (works both ways)
- Generate random things: provided a list of examples, can create brand-new things related to the examples
    - Can be used to generate random weapons/characters/places/etc

# Generator Format (easy mode)

Each generator file format is a JSON file containing the necessary data to build a prompt

Minimal format is as follows:

```
{
  "name": "Enemy Difficulty Detector",
  "description": "Detects the enemy difficulty given an enemy name",
  "context": "[ Outputs the enemy difficulty given the enemy name as input ]",
  "properties": [
    ["enemyName", "Input Enemy Name:"],
    ["enemyDifficulty", "Output Enemy Difficulty:"]
  ],
  "exampleList": [
    {
      "enemyName": "Orc Warlock",
      "enemyDifficulty": "hard"
    },
    {
      "enemyName": "Rabid Mouse",
      "enemyDifficulty": "easy"
    }
  ]
}
```

Let's review each property one by one to explain them

## `name`

The name of your generator  
For display purpose only

## `description`

The description of your generator  
For display purpose only

## `context`

Context is a text that will be inserted at the very top of the generated prompt  
It is used to give the AI some context about what you're trying to do in this generator  
It's a very powerful tool if used correctly, but the wording needs to be chosen with care or it might have negative
impacts  
You can set this value to `null` or empty string `""` to disable context injection

## `properties`

Defines which properties will be used in the examples, and in which order  
It should be provided as a list of string pairs `["A", "B"]` like in the example  
`A` is the property name, and `B` is the property name replacement as it will appear in the generated prompt

As for everything that ends up in the prompt, words used in the `B` value should be carefully picked and tested  
Using words such as `input` and `output` in the name replacement `B` seems to help in some cases

***Important: the order in which properties are defined will be the order used in the generated prompt!***

## `exampleList`

The main part of a generator, it's a list of examples of things you want to generate  
It should be provided as a list of flat JSON objects, in which each property is one of the defined ones in `properties`
above

You can put as many examples as you want here, the more the better!  
The generator will first shuffle the examples, then put as many as it can into the prompt

***Note: don't put stuff that you really want the AI to generate as examples!***
It seems counterintuitive, but you should only write examples of things ***like*** the thing you're trying to generate  
If you put **the** things you want the AI to generate as example, they will not come in the results as the AI tries to
generate new samples, not reproduce them

### Generated Prompt

Generators have two purposes, the first one being to generate a ***prompt*** that the AI will use to generate results  
A prompt is just a text that we feed to the AI for it to complete

Given the example above, using the generator without any arguments (we'll get to them later), here is what the generated
could look like:

```
[ Outputs the enemy difficulty given the enemy name as input ]
⁂
Input Enemy Name: Orc Warlock
Output Enemy Difficulty: hard
⁂
Input Enemy Name: Rabid Mouse
Output Enemy Difficulty: easy
⁂
Input Enemy Name:
```

# Generator Format (advanced mode)

## `exampleItemSeparator`

Defaults to `"⁂\n"`  
String used to separate example items in the prompt  
***Setting this value to `null` may have unexpected results, if not
needed, set it to its default value or omit this property entirely***

How to use:

```
{
  "name": "...",
  "description": "...",
  "context": "...",
  "properties": [...],
  "exampleList": [...],
  "exampleItemSeparator": "⁂\n"
}
```

## `exampleItemPropertySeparator`

Defaults to `"\n"`  
String used to separate example item properties in the prompt  
***Setting this value to `null` may have unexpected results, if not
needed, set it to its default value or omit this property entirely***

How to use:

```
{
  "name": "...",
  "description": "...",
  "context": "...",
  "properties": [...],
  "exampleList": [...],
  "exampleItemPropertySeparator": "\n"
}
```

## `exampleItemPropertyValueSeparator`

Defaults to `" "`  
String used to separate example item property and value in the prompt  
***Setting this value to `null` may have unexpected results, if not
needed, set it to its default value or omit this property entirely***

How to use:

```
{
  "name": "...",
  "description": "...",
  "context": "...",
  "properties": [...],
  "exampleList": [...],
  "exampleItemPropertyValueSeparator": " "
}
```

## `placeholders`

Should be provided as Map<String, String> representing `"placeholder": "replacementValue"`  
Will replace the `${placeholder}` values in the `exampleList` item values by `replacementValue`

Here, we replace `${currency}` from the examples by `gold`:

```
{
  "name": "Item Price Estimator",
  "description": "Estimates the price of an item",
  "context": "...",
  "properties": [...],
  "placeholders": {
    "currency": "gold"
  },
  "exampleList": [
    {
      "itemName": "Ragged Loincloth",
      "itemPrice": "3 ${currency}"
    },
    {
      "enemyName": "Legendary Dragon-tooth Sword",
      "enemyDifficulty": "9500 ${currency}"
    }
  ]
}
```

## `aiParameters` and `aiModel`

If you need even more control over the AI generation, you can optionally provide customized AI parameters and model
from [NovelAI's API](https://api.novelai.net/docs/static/index.html#/%2Fai%2F/AIController_aiGenerate)

Example below overrides framework's default AI generation parameters to add banned tokens and change the temperature:

```
{
  "name": "Item Price Estimator",
  "description": "Estimates the price of an item",
  "context": "...",
  "properties": [...],
  "exampleList": [...],
  "aiParameters": {
    "bad_words_ids": [[27,91,437,1659,5239,91,29],[1279,91,437,1659,5239,91,29],[27,91,10619,46,9792,13918,91,29],[1279,91,10619,46,9792,13918,91,29]]
    "temperature": 0.9
  }
}
```

You can also provide an alternative ***model*** for the AI to use:

```
{
  "name": "Item Price Estimator",
  "description": "Estimates the price of an item",
  "context": "...",
  "properties": [...],
  "exampleList": [...],
  "aiParameters": {...},
  "aiModel": "genji-python-6b"
}
```

# Generator Format (hardcore mode)

Last but not least, for the most motivated...  
It's possible to use different properties in different orders using different generation parameters, using ***
submodules***

Submodules are generators too and uses default generator values as a basis, but overrides needed properties for
specialisation  
They are specially useful to reuse different properties in different orders to achieve different results  
An as example, you could write a translation generator, provide translated sentences in 3 languages (3 properties), then
make specialized submodules that will only pull two selected languages and order them to translate one way or another!

Below is an example of an ***"Enemy Generator"***, it contains ***three submodules*** to uses the same `exampleList`
items with different properties, in different orders, and overriding AI generation parameters when needed (this is a
fake example)

```
{
  "name": "Enemy Generator",
  "description": "Generates enemies, enemy equipment and loot when killed",
  "context": "...",
  "properties": [
    ["name", "Enemy Name:"],
    ["difficulty", "Enemy Difficulty:"],
    ["item", "Item Name:"],
    ["type", "Item Type:"],
    ["rarity", "Item Rarity:"],
    ["price", "Item Price:"],
    ["encounterDescription", "Encounter Description:"]
  ],
  "placeholders": {...},
  "exampleList": [
    {
      "name": "Orc Soldier",
      "difficulty": "medium",
      "item": "Iron Broad Sword",
      "type": "weapon",
      "rarity": "common",
      "price": "100 ${currency}",
      "encounterDescription": "The Orc soldier with it's worn leather armor and broad sword slowly and silently approach you from deep in the woods reading its weapon for a powerful and swift attack."
    },
    {
      "name": "Rabid Unicorn",
      "difficulty": "hard",
      "item": "Unicorn Horn",
      "type": "component",
      "rarity": "uncommon",
      "price": "300 ${currency}",
      "encounterDescription": "You spot an all white rabid unicorn tearing through the brush chasing and gouging at another adventure that came along its gaze."
    }
  ],
  "aiParameters": {...},
  "aiModel": "6B-v4",
  "submodules": {
    "generateEnemy": {
      "context": "[ Generates random enemies and encounter description ]",
      "properties": [
        ["difficulty", "Enemy Difficulty:"],
        ["name", "Enemy Name:"],
        ["encounterDescription", "Encounter Description:"]
      ],
      "aiModel": "2.7B"
    },
    "generateEnemyEquipment": {
      "context": "[ Detects the equipment of an enemy given its name and difficulty ]",
      "properties": [
        ["name", "Enemy Name:"],
        ["difficulty", "Enemy Difficulty:"],
        ["equipment", "Enemy Equipment:"]
      ],
      "aiParameters": {
        "bad_words_ids": [[27,91,437,1659,5239,91,29],[1279,91,437,1659,5239,91,29],[27,91,10619,46,9792,13918,91,29],[1279,91,10619,46,9792,13918,91,29]]
        "temperature": 0.9
      }
    },
    "generateLoot": {
      "context": "[ Generates a random loot given and enemy's name and difficulty ]",
      "placeholders": {
        "currency": "gold coin(s)"
      },
      "properties": [
        ["name", "Enemy Name:"],
        ["difficulty", "Enemy Difficulty:"],
        ["item", "Looted Item Name:"],
        ["type", "Looted Item Type:"],
        ["rarity", "Looted Item Rarity:"],
        ["price", "Looted Item Price:"],
      ],
    }
  }
}
```

Every property of a submodule is optional and will override general values if provided  
You can remove a general value by overriding it with a `null` value in the submodule values