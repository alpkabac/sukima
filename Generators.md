# Generators Explainded
Generators are a notion inherited from AIDungeon's "evalbots"  
They are prompts that are executed before or after the actual AI story generation, allowing to do useful things to either the input or the output  
Fundamentally, generators here are a tool to build a prompt using several examples

## What are they for?
Generators can do a lot of useful things, from format conversion to data extraction, or plain item generation  
Below is a non-exhaustive list of things they can do:
- Convert data format: 
  - transform JSON from or into YAML
  - transform `[ Character: Alice; gender: female; age:23; personality: joyful, curious ]` into `Alice is a young joyful and curious adult` (works both ways)
- Generate random things: provided a list of examples, can create brand-new things related to the examples
  - Can be used to generate random weapons/characters/places/etc


## Generator Format
Each generator file is a JSON file containing the necessary data to build a prompt