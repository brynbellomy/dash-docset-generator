
MODULE_NAME=dash-docset-generator

SRC_DIR=src
SRC_DTS_DIR=$(SRC_DIR)/d.ts
BUILD_DIR=build

NODE_EXECUTABLE=$(shell which node)

#JS_TARGET=$(shell cat ./tsconfig.json | jq '.compilerOptions.target')

SOURCES=$(SRC_DIR)/*.ts


#### ------- tha makefyle ------- #####

all: .FORCE

.FORCE: clean build

build:
	tsc --project .
	#cp ./$(SRC_DTS_DIR)/*.d.ts ./$(BUILD_DIR)/

clean:
	rm -rf $(BUILD_DIR)

