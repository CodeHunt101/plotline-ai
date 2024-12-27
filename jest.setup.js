// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { ReadableStream } from 'web-streams-polyfill';

global.ReadableStream = ReadableStream;
