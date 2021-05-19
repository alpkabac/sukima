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
    repetition_penalty_range=2048,#512,
    repetition_penalty_slope=3.33
)
generator.max_history_tokens = 2048#1024

from flask import Flask, request
from flask_json import FlaskJSON, JsonError, json_response, as_json

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
    prompt = data['prompt']#request.form['prompt']
    nb_answer = int(data['nb_answer'])#request.form['nb_answer'])
    raw = bool(data['raw'])#request.form['raw'])
    generate_num = int(data['generate_num'])#request.form['generate_num'])
    temp = float(data['temp'])
    if nb_answer is None:
        nb_answer = 1

    ret = []
    ret_raw = ""

    for i in range(nb_answer):
        t = generator.generate_raw(
            """""",
            prompt,
            generate_num if generate_num is not None else generator.generate_num,
            temp if temp is not None else generator.temp,
            generator.top_k,
            generator.top_p,
            generator.repetition_penalty,
            generator.repetition_penalty_range,
            generator.repetition_penalty_slope,
            generator.tokenizer.encode(["<|endoftext|>", ">"])
        )
        ret.append(t)
        ret_raw += t+"\n\n"

    if raw is not None and raw is True:
        return ret_raw
    return json.dumps(ret, indent=2)


if __name__ == '__main__':
    api.run()
