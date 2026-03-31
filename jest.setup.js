// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { TransformStream } from "node:stream/web";

Object.assign(global, { TransformStream });
