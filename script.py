#!/user/bin/env python3

import sys
import pickle
import sklearn
#read model
with open('pickle_model.pkl', 'rb') as file:
              pickle_model = pickle.load(file)

model_record=[[sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4],sys.argv[5],sys.argv[6],sys.argv[7],sys.argv[8],sys.argv[9],sys.argv[10],sys.argv[11]],[sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4],sys.argv[5],sys.argv[6],sys.argv[7],sys.argv[8],sys.argv[9],sys.argv[10],sys.argv[11]]]
print(pickle_model.predict(model_record)[0])