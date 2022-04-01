class GPTAuto:
    def __init__(self, model_name='generic'):
        self.model_name = model_name

    def generate(self, args):
        raise NotImplementedError
    
    def classify(self, args):
        raise NotImplementedError