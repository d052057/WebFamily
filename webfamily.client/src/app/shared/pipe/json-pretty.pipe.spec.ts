import { JsonPrettyPipe } from './json-pretty.pipe';

describe('JsonPrettyPipe', () => {
  it('create an instance', () => {
    const pipe = new JsonPrettyPipe();
    expect(pipe).toBeTruthy();
  });
});
