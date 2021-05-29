# a little script to test if 16 bit degrades accuracy of the model. Not a perfect experiment but I think it's good enough
# must be moved to the clover-edition directory or it will not run
# I can not figure out why. According to pythons documentation, only the current directory matters, not the placement of the file
import json

from getconfig import settings

settings['log-level'] = str(min(settings.getint('log-level'), 10))
from gpt2generator import GPT2Generator

generator = GPT2Generator(
    model_path="models/gpt-neo-2.7B-horni-ln",
    generate_num=60,
    temperature=0.6,
    top_k=40,
    top_p=0.9,
    repetition_penalty=1.25,
    repetition_penalty_range=512,  # 512,
    repetition_penalty_slope=3.33
)

from flask import Flask, request
from flask_json import FlaskJSON

api = Flask(__name__)
FlaskJSON(api)


@api.route('/tokens', methods=['POST'])
def get_tokens():
    data = request.get_json(force=True)
    prompt = data['prompt']
    tokens = generator.tokenizer.encode(prompt, add_special_tokens=False, add_prefix_space=True)
    return json.dumps(tokens, indent=2)


@api.route('/prompt', methods=['POST'])
def get_prompt():
    data = request.get_json(force=True)
    prompt = data['prompt']
    nb_answer = int(data['nb_answer']) if 'nb_answer' in data else 1
    generate_num = int(data['generate_num']) if 'generate_num' in data else 10
    temp = float(data['temp']) if 'temp' in data else 0.8
    top_k = int(data['top_k']) if 'top_k' in data else 50
    top_p = float(data['top_p']) if 'top_p' in data else 0.9
    repetition_penalty = float(data['repetition_penalty']) if 'repetition_penalty' in data else 1.5
    repetition_penalty_range = int(data['repetition_penalty_range']) if 'repetition_penalty_range' in data else 512
    repetition_penalty_slope = float(data['repetition_penalty_slope']) if 'repetition_penalty_slope' in data else 3.33


    generator.max_history_tokens = 2048 - generate_num

    if nb_answer is None:
        nb_answer = 1

    ret = []

    for i in range(nb_answer):
        t = generator.generate_raw(
            "",
            prompt,
            generate_num,
            temp,
            top_k,
            top_p,
            repetition_penalty,
            repetition_penalty_range,
            repetition_penalty_slope,
            generator.tokenizer.encode(["<|endoftext|>", ">"])
        )
        ret.append(t)

    return json.dumps(ret, indent=2)


if __name__ == '__main__':
    api.run()
