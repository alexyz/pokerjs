#!/bin/sh
DIR=$(dirname $0)
/Users/alex/Library/Python/2.7/bin/aws s3 sync $DIR/public s3://pokerjs
