import { BackActionStack, IGNORE_BACK } from '../../src/utils/backActionStack';

describe('BackActionStack', () => {
  it('runs the fallback when no card registered an action', () => {
    const stack = new BackActionStack();
    const fallback = jest.fn();

    stack.handle(fallback);

    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('runs only the newest registered action', () => {
    const stack = new BackActionStack();
    const older = jest.fn();
    const newer = jest.fn();
    const fallback = jest.fn();
    stack.push(older);
    stack.push(newer);

    stack.handle(fallback);

    expect(newer).toHaveBeenCalledTimes(1);
    expect(older).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
  });

  it('removes only the entry of the card that unmounts', () => {
    const stack = new BackActionStack();
    const older = jest.fn();
    const newer = jest.fn();
    const olderId = stack.push(older);
    stack.push(newer);

    stack.remove(olderId);
    stack.handle(jest.fn());

    expect(stack.size).toBe(1);
    expect(newer).toHaveBeenCalledTimes(1);
  });

  it('falls back again once every action is removed', () => {
    const stack = new BackActionStack();
    const fallback = jest.fn();
    stack.remove(stack.push(jest.fn()));

    stack.handle(fallback);

    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('swallows Back without closing the card while money is moving', () => {
    const stack = new BackActionStack();
    const fallback = jest.fn();
    stack.push(IGNORE_BACK);

    stack.handle(fallback);

    expect(fallback).not.toHaveBeenCalled();
  });
});
