import type { JoinClause, JoinType, SelectColumn } from '../adapter.ts';
import type { MergeColumnTypeMaps, PrimaryKeyInputForRow, QueryColumnInput, QueryColumnName, QueryColumnTypeMap, QueryColumns, RelationMapForSourceName, ReturningInput, SelectedAliasRow, WriteResult, WriteRowResult, WriteRowsResult } from '../database.ts';
import type { Predicate, WhereInput } from '../operators.ts';
import type { AnyRelation, AnyTable, LoadedRelationMap, OrderByClause } from '../table.ts';
import { loadRowsWithRelations, type QueryExecutionContext } from './execution-context.ts';
export type QueryState = {
    select: '*' | SelectColumn[];
    distinct: boolean;
    joins: JoinClause[];
    where: Predicate<string>[];
    groupBy: string[];
    having: Predicate<string>[];
    orderBy: OrderByClause[];
    limit?: number;
    offset?: number;
    with: Record<string, AnyRelation>;
};
/**
 * Immutable query builder used by `db.query(table)`.
 */
export declare class QueryBuilder<columnTypes extends Record<string, unknown>, row extends Record<string, unknown>, loaded extends Record<string, unknown> = {}, tableName extends string = string, primaryKey extends readonly string[] = readonly string[]> {
    #private;
    constructor(database: QueryExecutionContext, table: AnyTable, state: QueryState);
    /**
     * Narrows selected columns, optionally with aliases.
     */
    select<selection extends (keyof row & string)[]>(...columns: selection): QueryBuilder<columnTypes, Pick<row, selection[number]>, loaded, tableName, primaryKey>;
    select<selection extends Record<string, QueryColumnInput<columnTypes>>>(selection: selection): QueryBuilder<columnTypes, SelectedAliasRow<columnTypes, selection>, loaded, tableName, primaryKey>;
    /**
     * Toggles `distinct` selection.
     * @param value When `true`, eliminates duplicate rows.
     * @returns A cloned query builder with updated distinct state.
     */
    distinct(value?: boolean): QueryBuilder<columnTypes, row, loaded, tableName, primaryKey>;
    /**
     * Adds a where predicate.
     * @param input Predicate expression or column-value shorthand.
     * @returns A cloned query builder with the appended where predicate.
     */
    where(input: WhereInput<QueryColumns<columnTypes>>): QueryBuilder<columnTypes, row, loaded, tableName, primaryKey>;
    /**
     * Adds a having predicate.
     * @param input Predicate expression or aggregate filter shorthand.
     * @returns A cloned query builder with the appended having predicate.
     */
    having(input: WhereInput<QueryColumns<columnTypes>>): QueryBuilder<columnTypes, row, loaded, tableName, primaryKey>;
    /**
     * Adds a join clause.
     * @param target Target table to join.
     * @param on Join predicate.
     * @param type Join type.
     * @returns A query builder whose column map includes joined table columns.
     */
    join<target extends AnyTable>(target: target, on: Predicate<QueryColumns<columnTypes> | QueryColumnName<target>>, type?: JoinType): QueryBuilder<MergeColumnTypeMaps<columnTypes, QueryColumnTypeMap<target>>, row, loaded, tableName, primaryKey>;
    /**
     * Adds a left join clause.
     * @param target Target table to join.
     * @param on Join predicate.
     * @returns A query builder whose column map includes joined table columns.
     */
    leftJoin<target extends AnyTable>(target: target, on: Predicate<QueryColumns<columnTypes> | QueryColumnName<target>>): QueryBuilder<MergeColumnTypeMaps<columnTypes, QueryColumnTypeMap<target>>, row, loaded, tableName, primaryKey>;
    /**
     * Adds a right join clause.
     * @param target Target table to join.
     * @param on Join predicate.
     * @returns A query builder whose column map includes joined table columns.
     */
    rightJoin<target extends AnyTable>(target: target, on: Predicate<QueryColumns<columnTypes> | QueryColumnName<target>>): QueryBuilder<MergeColumnTypeMaps<columnTypes, QueryColumnTypeMap<target>>, row, loaded, tableName, primaryKey>;
    /**
     * Appends an order-by clause.
     * @param column Column to sort by.
     * @param direction Sort direction.
     * @returns A cloned query builder with the appended order-by clause.
     */
    orderBy(column: QueryColumnInput<columnTypes>, direction?: 'asc' | 'desc'): QueryBuilder<columnTypes, row, loaded, tableName, primaryKey>;
    /**
     * Appends group-by columns.
     * @param columns Columns to include in the grouping set.
     * @returns A cloned query builder with appended group-by columns.
     */
    groupBy(...columns: QueryColumnInput<columnTypes>[]): QueryBuilder<columnTypes, row, loaded, tableName, primaryKey>;
    /**
     * Limits returned rows.
     * @param value Maximum number of rows to return.
     * @returns A cloned query builder with a row limit.
     */
    limit(value: number): QueryBuilder<columnTypes, row, loaded, tableName, primaryKey>;
    /**
     * Skips returned rows.
     * @param value Number of rows to skip.
     * @returns A cloned query builder with a row offset.
     */
    offset(value: number): QueryBuilder<columnTypes, row, loaded, tableName, primaryKey>;
    /**
     * Configures eager-loaded relations.
     * @param relations Relation map describing nested eager-load behavior.
     * @returns A cloned query builder with relation loading configuration.
     */
    with<relations extends RelationMapForSourceName<tableName>>(relations: relations): QueryBuilder<columnTypes, row, loaded & LoadedRelationMap<relations>, tableName, primaryKey>;
    /**
     * Executes the query and returns all rows.
     * @returns All matching rows with requested eager-loaded relations.
     */
    all(): Promise<Array<row & loaded>>;
    /**
     * Executes the built select query and hydrates any configured eager-loaded relations.
     *
     * @returns Raw rows with eager-loaded relation data applied.
     */
    [loadRowsWithRelations](): Promise<Record<string, unknown>[]>;
    /**
     * Executes the query and returns the first row.
     * @returns The first matching row, or `null` when no rows match.
     */
    first(): Promise<(row & loaded) | null>;
    /**
     * Loads a single row by primary key.
     * @param value Primary-key value or composite-key object.
     * @returns The matching row, or `null` when no row exists.
     */
    find(value: PrimaryKeyInputForRow<row, primaryKey>): Promise<(row & loaded) | null>;
    /**
     * Executes a count query.
     * @returns Number of rows that match the current query scope.
     */
    count(): Promise<number>;
    /**
     * Executes an existence query.
     * @returns `true` when at least one row matches the current query scope.
     */
    exists(): Promise<boolean>;
    /**
     * Inserts one row.
     * @param values Values to insert.
     * @param options Insert options.
     * @param options.returning Optional return selection for adapters that support returning.
     * @param options.touch When `true`, manages timestamp columns automatically.
     * @returns Insert metadata, and optionally the returned row.
     */
    insert(values: Partial<row>, options?: {
        returning?: ReturningInput<row>;
        touch?: boolean;
    }): Promise<WriteResult | WriteRowResult<row>>;
    /**
     * Inserts many rows.
     * @param values Values to insert.
     * @param options Insert options.
     * @param options.returning Optional return selection for adapters that support returning.
     * @param options.touch When `true`, manages timestamp columns automatically.
     * @returns Insert metadata, and optionally the returned rows.
     */
    insertMany(values: Partial<row>[], options?: {
        returning?: ReturningInput<row>;
        touch?: boolean;
    }): Promise<WriteResult | WriteRowsResult<row>>;
    /**
     * Updates scoped rows.
     * @param changes Column changes to apply.
     * @param options Update options.
     * @param options.returning Optional return selection for adapters that support returning.
     * @param options.touch When `true`, updates timestamp columns automatically.
     * @returns Update metadata, and optionally the returned rows.
     */
    update(changes: Partial<row>, options?: {
        returning?: ReturningInput<row>;
        touch?: boolean;
    }): Promise<WriteResult | WriteRowsResult<row>>;
    /**
     * Deletes scoped rows.
     * @param options Delete options.
     * @param options.returning Optional return selection for adapters that support returning.
     * @returns Delete metadata, and optionally the returned rows.
     */
    delete(options?: {
        returning?: ReturningInput<row>;
    }): Promise<WriteResult | WriteRowsResult<row>>;
    /**
     * Performs an upsert operation.
     * @param values Values to insert.
     * @param options Upsert options.
     * @param options.returning Optional return selection for adapters that support returning.
     * @param options.touch When `true`, manages timestamp columns automatically.
     * @param options.conflictTarget Conflict target columns for adapters that require them.
     * @param options.update Optional update payload used when a conflict occurs.
     * @returns Upsert metadata, and optionally the returned row.
     */
    upsert(values: Partial<row>, options?: {
        returning?: ReturningInput<row>;
        touch?: boolean;
        conflictTarget?: (keyof row & string)[];
        update?: Partial<row>;
    }): Promise<WriteResult | WriteRowResult<row>>;
}
export declare function createInitialQueryState(): QueryState;
//# sourceMappingURL=query-builder.d.ts.map