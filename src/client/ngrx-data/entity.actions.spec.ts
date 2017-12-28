import { Injectable } from '@angular/core';
import { Action } from '@ngrx/store';
import { Actions } from '@ngrx/effects';
import { flattenArgs } from './interfaces';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Operator } from 'rxjs/Operator';
import { filter, share, takeUntil } from 'rxjs/operators';

import { EntityAction, EntityActions, EntityOp } from './entity.actions';

class Hero {
  id: number;
  name: string;
}

describe('EntityAction', () => {

  it('should create expected EntityAction for named entity', () => {
    const hero: Hero = {id: 42, name: 'Francis' };
    const action = new EntityAction('Hero', EntityOp.ADD_ONE, hero);
    expect(action.entityName).toBe('Hero');
    expect(action.op).toBe(EntityOp.ADD_ONE);
    expect(action.payload).toBe(hero);
  });

  it('should create EntityAction from another EntityAction', () => {
    const hero: Hero = {id: 42, name: 'Francis' };
    const action1 = new EntityAction('Hero', EntityOp.ADD_ONE, hero);
    const action = new EntityAction(action1, EntityOp.SAVE_ADD)
    expect(action.entityName).toBe('Hero');
    expect(action.op).toBe(EntityOp.SAVE_ADD);
    // Forward's the payload to the new action.
    expect(action.payload).toBe(hero);
  });
  it('can suppress the payload when create EntityAction from another EntityAction', () => {
    const hero: Hero = {id: 42, name: 'Francis' };
    const action1 = new EntityAction('Hero', EntityOp.ADD_ONE, hero);
    const action = new EntityAction(action1, EntityOp.SAVE_ADD, undefined)
    expect(action.entityName).toBe('Hero');
    expect(action.op).toBe(EntityOp.SAVE_ADD);
    expect(action.payload).toBeUndefined();
  });
  it('should format type as expected with #formatActionTypeName()', () => {
    const action = new EntityAction('Hero', EntityOp.QUERY_ALL);
    const expectedFormat = EntityAction.formatActionTypeName(EntityOp.QUERY_ALL, 'Hero');
    expect(action.type).toBe(expectedFormat);
  });

  it('should throw if do not specify entity name', () => {
    expect(() => new EntityAction(null)).toThrow();
  });

  it('should throw if do not specify EntityOp', () => {
    expect(() => new EntityAction('Hero')).toThrow();
  });
});

describe('EntityActions', () => {

  let source: Subject<Action>;
  let eas: EntityActions;

  beforeEach(() => {
    source = new Subject<Action>();
    const actions = new Actions(source);
    eas = new EntityActions(actions);
  });

  // Todo: use marble testing for succinctness
  it('#filter', () => {
    const results: any[] = [];

    // Filter for the 'Hero' EntityAction with a payload
    eas.filter(ea => ea.entityName === 'Hero' && ea.payload != null)
      .subscribe(ea => results.push(ea));

    // This is it
    const expectedResults = [new EntityAction('Hero', EntityOp.SAVE_DELETE, 42)];

    source.next({type: 'foo'});
    source.next(new EntityAction('Hero', EntityOp.QUERY_ALL));
    source.next(new EntityAction('Villain', EntityOp.QUERY_ALL));
    source.next(expectedResults[0]);
    source.next(<any> {type: 'bar', payload: 'bar'});

    expect(results).toEqual(expectedResults);
  });

  ///////////////

  it('#ofEntity', () => {
    const results: any[] = [];

    // EntityActions of any kind
    eas.ofEntity().subscribe(ea => results.push(ea));

    const expectedResults = [
      new EntityAction('Hero', EntityOp.SAVE_DELETE, 42),
      new EntityAction('Villain', EntityOp.QUERY_ALL)
    ];

    source.next({type: 'foo'});
    source.next(expectedResults[0]);
    source.next(<any> {type: 'bar', payload: 'bar'});
    source.next(expectedResults[1]);

    expect(results).toEqual(expectedResults);
  });

  ///////////////

  it('#ofEntityType', () => {
    const results: any[] = [];

    // EntityActions of one type
    eas.ofEntityType('Hero').subscribe(ea => results.push(ea));

    const expectedResults = [
      new EntityAction('Hero', EntityOp.SAVE_DELETE, 42)
    ];

    source.next({type: 'foo'});
    source.next(expectedResults[0]);
    source.next(<any> {type: 'bar', payload: 'bar'});
    source.next(new EntityAction('Villain', EntityOp.QUERY_ALL));

    expect(results).toEqual(expectedResults);
  });

  ///////////////

  it('#ofEntityTypes with string args', () => {
    const results: any[] = [];

    eas.ofEntityTypes('Hero', 'Villain')
    .subscribe(ea => results.push(ea));

    ofEntityTypesTest(results);
  });

  it('#ofEntityTypes with ...rest args', () => {
    const results: any[] = [];
    const types = ['Hero', 'Villain'];

    eas.ofEntityTypes(...types).subscribe(ea => results.push(ea));
    ofEntityTypesTest(results);
  });

  it('#ofEntityTypes with array args', () => {
    const results: any[] = [];
    const types = ['Hero', 'Villain'];

    eas.ofEntityTypes(types).subscribe(ea => results.push(ea));
    ofEntityTypesTest(results);
  });

  function ofEntityTypesTest(results: any[]) {
    const expectedResults = [
      new EntityAction('Hero', EntityOp.QUERY_ALL),
      new EntityAction('Villain', EntityOp.QUERY_ALL),
      new EntityAction('Hero', EntityOp.SAVE_DELETE, 42)
    ];
    source.next({type: 'foo'});
    source.next(expectedResults[0]);
    source.next(expectedResults[1]);
    source.next(<any> {type: 'bar', payload: 'bar'});
    source.next(expectedResults[2]);

    expect(results).toEqual(expectedResults);
  }

  ///////////////

  it('#ofOp with string args', () => {
    const results: any[] = [];

    eas.ofOp(EntityOp.QUERY_ALL, EntityOp.QUERY_MANY)
    .subscribe(ea => results.push(ea));

    ofOpTest(results);
  });

  it('#ofOp with ...rest args', () => {
    const results: any[] = [];
    const ops = [EntityOp.QUERY_ALL, EntityOp.QUERY_MANY];

    eas.ofOp(...ops).subscribe(ea => results.push(ea));
    ofOpTest(results);
  });

  it('#ofOp with array args', () => {
    const results: any[] = [];
    const ops = [EntityOp.QUERY_ALL, EntityOp.QUERY_MANY];

    eas.ofOp(ops).subscribe(ea => results.push(ea));
    ofOpTest(results);
  });

  function ofOpTest(results: any[]) {
    const expectedResults = [
      new EntityAction('Hero', EntityOp.QUERY_ALL),
      new EntityAction('Villain', EntityOp.QUERY_MANY)
    ];
    source.next({type: 'foo'});
    source.next(expectedResults[0]);
    source.next(new EntityAction('Hero', EntityOp.SAVE_DELETE, 42));
    source.next(expectedResults[1]);
    source.next(<any> {type: 'bar', payload: 'bar'});

    expect(results).toEqual(expectedResults);
  }

  ///////////////

  it('#ofType with string args', () => {
    const results: any[] = [];

    eas.ofType('QUERY_ALL [HERO]', 'QUERY_ALL [VILLAIN]')
    .subscribe(ea => results.push(ea));

    ofTypeTest(results);
  });

  it('#ofType with ...rest args', () => {
    const results: any[] = [];
    const types = ['QUERY_ALL [HERO]', 'QUERY_ALL [VILLAIN]'];

    eas.ofType(...types).subscribe(ea => results.push(ea));
    ofTypeTest(results);
  });

  it('#ofType with array args', () => {
    const results: any[] = [];
    const types = ['QUERY_ALL [HERO]', 'QUERY_ALL [VILLAIN]'];

    eas.ofType(types).subscribe(ea => results.push(ea));
    ofTypeTest(results);
  });

  function ofTypeTest(results: any[]) {
    const expectedResults = [
      new EntityAction('Hero', EntityOp.QUERY_ALL),
      new EntityAction('Villain', EntityOp.QUERY_ALL)
    ];
    source.next({type: 'foo'});
    source.next(expectedResults[0]);
    source.next(new EntityAction('Hero', EntityOp.SAVE_DELETE, 42));
    source.next(expectedResults[1]);
    source.next(<any> {type: 'bar', payload: 'bar'});

    expect(results).toEqual(expectedResults);
  }
});
