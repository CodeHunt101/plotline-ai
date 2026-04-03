// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";
import {
  ReadableStream,
  TextDecoderStream,
  TransformStream,
  WritableStream,
} from "node:stream/web";

Object.assign(global, {
  ReadableStream,
  TextDecoder,
  TextDecoderStream,
  TextEncoder,
  TransformStream,
  WritableStream,
  scrollTo: jest.fn(),
  IntersectionObserver: jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(),
  })),
});
