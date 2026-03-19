import { DataTableQueryError, DataTableValidationError } from "../errors.js";
import { normalizeWhereInput } from "../operators.js";
import { normalizeColumnInput } from "../references.js";
import { getPrimaryKeyObject, getTableColumns, getTableName } from "../table.js";
import { executeOperation, loadRowsWithRelations, } from "./execution-context.js";
import { buildPrimaryKeyPredicate, hasScopedWriteModifiers, loadPrimaryKeyRowsForScope, } from "./helpers.js";
import { loadRelationsForRows } from "./relations.js";
import { applyAfterReadHooksToLoadedRows, applyAfterReadHooksToRows, assertReturningCapability, normalizeReturningSelection, prepareInsertValues, prepareUpdateValues, runAfterDeleteHook, runAfterWriteHook, runBeforeDeleteHook, } from "./write-lifecycle.js";
/**
 * Immutable query builder used by `db.query(table)`.
 */
export class QueryBuilder {
    #database;
    #table;
    #state;
    constructor(database, table, state) {
        this.#database = database;
        this.#table = table;
        this.#state = state;
    }
    select(...input) {
        if (input.length === 1 &&
            typeof input[0] === 'object' &&
            input[0] !== null &&
            !Array.isArray(input[0])) {
            let selection = input[0];
            let aliases = Object.keys(selection);
            let select = aliases.map((alias) => ({
                column: normalizeColumnInput(selection[alias]),
                alias,
            }));
            return this.#clone({ select });
        }
        let columns = input;
        return this.#clone({
            select: columns.map((column) => ({ column, alias: column })),
        });
    }
    /**
     * Toggles `distinct` selection.
     * @param value When `true`, eliminates duplicate rows.
     * @returns A cloned query builder with updated distinct state.
     */
    distinct(value = true) {
        return this.#clone({ distinct: value });
    }
    /**
     * Adds a where predicate.
     * @param input Predicate expression or column-value shorthand.
     * @returns A cloned query builder with the appended where predicate.
     */
    where(input) {
        let predicate = normalizeWhereInput(input);
        let normalizedPredicate = normalizePredicateValues(predicate, createPredicateColumnResolver([this.#table, ...this.#state.joins.map((join) => join.table)]));
        return this.#clone({
            where: [...this.#state.where, normalizedPredicate],
        });
    }
    /**
     * Adds a having predicate.
     * @param input Predicate expression or aggregate filter shorthand.
     * @returns A cloned query builder with the appended having predicate.
     */
    having(input) {
        let predicate = normalizeWhereInput(input);
        let normalizedPredicate = normalizePredicateValues(predicate, createPredicateColumnResolver([this.#table, ...this.#state.joins.map((join) => join.table)]));
        return this.#clone({
            having: [...this.#state.having, normalizedPredicate],
        });
    }
    /**
     * Adds a join clause.
     * @param target Target table to join.
     * @param on Join predicate.
     * @param type Join type.
     * @returns A query builder whose column map includes joined table columns.
     */
    join(target, on, type = 'inner') {
        let normalizedOn = normalizePredicateValues(on, createPredicateColumnResolver([
            this.#table,
            ...this.#state.joins.map((join) => join.table),
            target,
        ]));
        return new QueryBuilder(this.#database, this.#table, {
            select: cloneSelection(this.#state.select),
            distinct: this.#state.distinct,
            joins: [...this.#state.joins, { type, table: target, on: normalizedOn }],
            where: [...this.#state.where],
            groupBy: [...this.#state.groupBy],
            having: [...this.#state.having],
            orderBy: [...this.#state.orderBy],
            limit: this.#state.limit,
            offset: this.#state.offset,
            with: { ...this.#state.with },
        });
    }
    /**
     * Adds a left join clause.
     * @param target Target table to join.
     * @param on Join predicate.
     * @returns A query builder whose column map includes joined table columns.
     */
    leftJoin(target, on) {
        return this.join(target, on, 'left');
    }
    /**
     * Adds a right join clause.
     * @param target Target table to join.
     * @param on Join predicate.
     * @returns A query builder whose column map includes joined table columns.
     */
    rightJoin(target, on) {
        return this.join(target, on, 'right');
    }
    /**
     * Appends an order-by clause.
     * @param column Column to sort by.
     * @param direction Sort direction.
     * @returns A cloned query builder with the appended order-by clause.
     */
    orderBy(column, direction = 'asc') {
        return this.#clone({
            orderBy: [...this.#state.orderBy, { column: normalizeColumnInput(column), direction }],
        });
    }
    /**
     * Appends group-by columns.
     * @param columns Columns to include in the grouping set.
     * @returns A cloned query builder with appended group-by columns.
     */
    groupBy(...columns) {
        return this.#clone({
            groupBy: [...this.#state.groupBy, ...columns.map((column) => normalizeColumnInput(column))],
        });
    }
    /**
     * Limits returned rows.
     * @param value Maximum number of rows to return.
     * @returns A cloned query builder with a row limit.
     */
    limit(value) {
        return this.#clone({ limit: value });
    }
    /**
     * Skips returned rows.
     * @param value Number of rows to skip.
     * @returns A cloned query builder with a row offset.
     */
    offset(value) {
        return this.#clone({ offset: value });
    }
    /**
     * Configures eager-loaded relations.
     * @param relations Relation map describing nested eager-load behavior.
     * @returns A cloned query builder with relation loading configuration.
     */
    with(relations) {
        return this.#clone({
            with: {
                ...this.#state.with,
                ...relations,
            },
        });
    }
    /**
     * Executes the query and returns all rows.
     * @returns All matching rows with requested eager-loaded relations.
     */
    async all() {
        let rows = await this[loadRowsWithRelations]();
        return applyAfterReadHooksToLoadedRows(this.#table, rows, this.#state.with);
    }
    /**
     * Executes the built select query and hydrates any configured eager-loaded relations.
     *
     * @returns Raw rows with eager-loaded relation data applied.
     */
    async [loadRowsWithRelations]() {
        let operation = this.#toSelectOperation();
        let result = await this.#database[executeOperation](operation);
        let rows = normalizeRows(result.rows);
        if (Object.keys(this.#state.with).length === 0) {
            return rows;
        }
        return loadRelationsForRows(this.#database, this.#table, rows, this.#state.with);
    }
    /**
     * Executes the query and returns the first row.
     * @returns The first matching row, or `null` when no rows match.
     */
    async first() {
        let rows = await this.limit(1).all();
        return rows[0] ?? null;
    }
    /**
     * Loads a single row by primary key.
     * @param value Primary-key value or composite-key object.
     * @returns The matching row, or `null` when no row exists.
     */
    async find(value) {
        let where = getPrimaryKeyObject(this.#table, value);
        return this.where(where).first();
    }
    /**
     * Executes a count query.
     * @returns Number of rows that match the current query scope.
     */
    async count() {
        let operation = {
            kind: 'count',
            table: this.#table,
            joins: [...this.#state.joins],
            where: [...this.#state.where],
            groupBy: [...this.#state.groupBy],
            having: [...this.#state.having],
        };
        let result = await this.#database[executeOperation](operation);
        if (result.rows && result.rows[0] && typeof result.rows[0].count === 'number') {
            return result.rows[0].count;
        }
        if (result.rows) {
            return result.rows.length;
        }
        return 0;
    }
    /**
     * Executes an existence query.
     * @returns `true` when at least one row matches the current query scope.
     */
    async exists() {
        let operation = {
            kind: 'exists',
            table: this.#table,
            joins: [...this.#state.joins],
            where: [...this.#state.where],
            groupBy: [...this.#state.groupBy],
            having: [...this.#state.having],
        };
        let result = await this.#database[executeOperation](operation);
        if (result.rows && result.rows[0] && typeof result.rows[0].exists === 'boolean') {
            return result.rows[0].exists;
        }
        if (result.rows && result.rows[0] && typeof result.rows[0].count === 'number') {
            return Number(result.rows[0].count) > 0;
        }
        return Boolean(result.rows && result.rows.length > 0);
    }
    /**
     * Inserts one row.
     * @param values Values to insert.
     * @param options Insert options.
     * @param options.returning Optional return selection for adapters that support returning.
     * @param options.touch When `true`, manages timestamp columns automatically.
     * @returns Insert metadata, and optionally the returned row.
     */
    async insert(values, options) {
        assertWriteState(this.#state, 'insert', {
            where: false,
            orderBy: false,
            limit: false,
            offset: false,
        });
        let preparedValues = prepareInsertValues(this.#table, values, this.#database.now(), options?.touch ?? true);
        let returning = options?.returning;
        assertReturningCapability(this.#database.adapter, 'insert', returning);
        if (returning) {
            let operation = {
                kind: 'insert',
                table: this.#table,
                values: preparedValues,
                returning: normalizeReturningSelection(returning),
            };
            let result = await this.#database[executeOperation](operation);
            let row = (applyAfterReadHooksToRows(this.#table, normalizeRows(result.rows))[0] ??
                null);
            let affectedRows = result.affectedRows ?? 0;
            runAfterWriteHook(this.#table, {
                operation: 'create',
                tableName: getTableName(this.#table),
                values: [preparedValues],
                affectedRows,
                insertId: result.insertId,
            });
            return {
                affectedRows,
                insertId: result.insertId,
                row,
            };
        }
        let operation = {
            kind: 'insert',
            table: this.#table,
            values: preparedValues,
        };
        let result = await this.#database[executeOperation](operation);
        let affectedRows = result.affectedRows ?? 0;
        runAfterWriteHook(this.#table, {
            operation: 'create',
            tableName: getTableName(this.#table),
            values: [preparedValues],
            affectedRows,
            insertId: result.insertId,
        });
        return {
            affectedRows,
            insertId: result.insertId,
        };
    }
    /**
     * Inserts many rows.
     * @param values Values to insert.
     * @param options Insert options.
     * @param options.returning Optional return selection for adapters that support returning.
     * @param options.touch When `true`, manages timestamp columns automatically.
     * @returns Insert metadata, and optionally the returned rows.
     */
    async insertMany(values, options) {
        assertWriteState(this.#state, 'insertMany', {
            where: false,
            orderBy: false,
            limit: false,
            offset: false,
        });
        let preparedValues = values.map((value) => prepareInsertValues(this.#table, value, this.#database.now(), options?.touch ?? true));
        if (preparedValues.length > 0 &&
            preparedValues.every((preparedValue) => Object.keys(preparedValue).length === 0)) {
            throw new DataTableQueryError('insertMany() requires at least one explicit value across the batch');
        }
        let returning = options?.returning;
        assertReturningCapability(this.#database.adapter, 'insertMany', returning);
        if (returning) {
            let operation = {
                kind: 'insertMany',
                table: this.#table,
                values: preparedValues,
                returning: normalizeReturningSelection(returning),
            };
            let result = await this.#database[executeOperation](operation);
            let affectedRows = result.affectedRows ?? 0;
            runAfterWriteHook(this.#table, {
                operation: 'create',
                tableName: getTableName(this.#table),
                values: preparedValues,
                affectedRows,
                insertId: result.insertId,
            });
            return {
                affectedRows,
                insertId: result.insertId,
                rows: applyAfterReadHooksToRows(this.#table, normalizeRows(result.rows)),
            };
        }
        let operation = {
            kind: 'insertMany',
            table: this.#table,
            values: preparedValues,
        };
        let result = await this.#database[executeOperation](operation);
        let affectedRows = result.affectedRows ?? 0;
        runAfterWriteHook(this.#table, {
            operation: 'create',
            tableName: getTableName(this.#table),
            values: preparedValues,
            affectedRows,
            insertId: result.insertId,
        });
        return {
            affectedRows,
            insertId: result.insertId,
        };
    }
    /**
     * Updates scoped rows.
     * @param changes Column changes to apply.
     * @param options Update options.
     * @param options.returning Optional return selection for adapters that support returning.
     * @param options.touch When `true`, updates timestamp columns automatically.
     * @returns Update metadata, and optionally the returned rows.
     */
    async update(changes, options) {
        assertWriteState(this.#state, 'update', {
            where: true,
            orderBy: true,
            limit: true,
            offset: true,
        });
        let returning = options?.returning;
        assertReturningCapability(this.#database.adapter, 'update', returning);
        let preparedChanges = prepareUpdateValues(this.#table, changes, this.#database.now(), options?.touch ?? true);
        if (Object.keys(preparedChanges).length === 0) {
            throw new DataTableQueryError('update() requires at least one change');
        }
        let result;
        if (hasScopedWriteModifiers(this.#state)) {
            let table = this.#table;
            let queryState = this.#state;
            result = await this.#database.transaction(async (tx) => {
                let primaryKeys = await loadPrimaryKeyRowsForScope(tx, table, queryState);
                let primaryKeyPredicate = buildPrimaryKeyPredicate(table, primaryKeys);
                if (!primaryKeyPredicate) {
                    return {
                        affectedRows: 0,
                        insertId: undefined,
                        rows: returning ? [] : undefined,
                    };
                }
                let txRuntime = tx;
                return txRuntime[executeOperation]({
                    kind: 'update',
                    table,
                    changes: preparedChanges,
                    where: [primaryKeyPredicate],
                    returning: returning ? normalizeReturningSelection(returning) : undefined,
                });
            });
        }
        else {
            let operation = {
                kind: 'update',
                table: this.#table,
                changes: preparedChanges,
                where: [...this.#state.where],
                returning: returning ? normalizeReturningSelection(returning) : undefined,
            };
            result = await this.#database[executeOperation](operation);
        }
        let affectedRows = result.affectedRows ?? 0;
        runAfterWriteHook(this.#table, {
            operation: 'update',
            tableName: getTableName(this.#table),
            values: [preparedChanges],
            affectedRows,
            insertId: result.insertId,
        });
        if (!returning) {
            return {
                affectedRows,
                insertId: result.insertId,
            };
        }
        return {
            affectedRows,
            insertId: result.insertId,
            rows: applyAfterReadHooksToRows(this.#table, normalizeRows(result.rows)),
        };
    }
    /**
     * Deletes scoped rows.
     * @param options Delete options.
     * @param options.returning Optional return selection for adapters that support returning.
     * @returns Delete metadata, and optionally the returned rows.
     */
    async delete(options) {
        assertWriteState(this.#state, 'delete', {
            where: true,
            orderBy: true,
            limit: true,
            offset: true,
        });
        let returning = options?.returning;
        assertReturningCapability(this.#database.adapter, 'delete', returning);
        let tableName = getTableName(this.#table);
        let deleteContext = {
            tableName,
            where: [...this.#state.where],
            orderBy: [...this.#state.orderBy],
            limit: this.#state.limit,
            offset: this.#state.offset,
        };
        runBeforeDeleteHook(this.#table, deleteContext);
        let result;
        if (hasScopedWriteModifiers(this.#state)) {
            let table = this.#table;
            let queryState = this.#state;
            result = await this.#database.transaction(async (tx) => {
                let primaryKeys = await loadPrimaryKeyRowsForScope(tx, table, queryState);
                let primaryKeyPredicate = buildPrimaryKeyPredicate(table, primaryKeys);
                if (!primaryKeyPredicate) {
                    return {
                        affectedRows: 0,
                        insertId: undefined,
                        rows: returning ? [] : undefined,
                    };
                }
                let txRuntime = tx;
                return txRuntime[executeOperation]({
                    kind: 'delete',
                    table,
                    where: [primaryKeyPredicate],
                    returning: returning ? normalizeReturningSelection(returning) : undefined,
                });
            });
        }
        else {
            let operation = {
                kind: 'delete',
                table: this.#table,
                where: [...this.#state.where],
                returning: returning ? normalizeReturningSelection(returning) : undefined,
            };
            result = await this.#database[executeOperation](operation);
        }
        let affectedRows = result.affectedRows ?? 0;
        runAfterDeleteHook(this.#table, {
            tableName,
            where: deleteContext.where,
            orderBy: deleteContext.orderBy,
            limit: deleteContext.limit,
            offset: deleteContext.offset,
            affectedRows,
        });
        if (!returning) {
            return {
                affectedRows,
                insertId: result.insertId,
            };
        }
        return {
            affectedRows,
            insertId: result.insertId,
            rows: applyAfterReadHooksToRows(this.#table, normalizeRows(result.rows)),
        };
    }
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
    async upsert(values, options) {
        assertWriteState(this.#state, 'upsert', {
            where: false,
            orderBy: false,
            limit: false,
            offset: false,
        });
        if (!this.#database.adapter.capabilities.upsert) {
            throw new DataTableQueryError('Adapter does not support upsert');
        }
        let preparedValues = prepareInsertValues(this.#table, values, this.#database.now(), options?.touch ?? true);
        let updateChanges = options?.update
            ? prepareUpdateValues(this.#table, options.update, this.#database.now(), options?.touch ?? true, 'create')
            : undefined;
        let returning = options?.returning;
        assertReturningCapability(this.#database.adapter, 'upsert', returning);
        if (returning) {
            let operation = {
                kind: 'upsert',
                table: this.#table,
                values: preparedValues,
                conflictTarget: options?.conflictTarget ? [...options.conflictTarget] : undefined,
                update: updateChanges,
                returning: normalizeReturningSelection(returning),
            };
            let result = await this.#database[executeOperation](operation);
            let row = (applyAfterReadHooksToRows(this.#table, normalizeRows(result.rows))[0] ??
                null);
            let affectedRows = result.affectedRows ?? 0;
            let preparedWriteValues = updateChanges
                ? [preparedValues, updateChanges]
                : [preparedValues];
            runAfterWriteHook(this.#table, {
                operation: 'create',
                tableName: getTableName(this.#table),
                values: preparedWriteValues,
                affectedRows,
                insertId: result.insertId,
            });
            return {
                affectedRows,
                insertId: result.insertId,
                row,
            };
        }
        let operation = {
            kind: 'upsert',
            table: this.#table,
            values: preparedValues,
            conflictTarget: options?.conflictTarget ? [...options.conflictTarget] : undefined,
            update: updateChanges,
        };
        let result = await this.#database[executeOperation](operation);
        let affectedRows = result.affectedRows ?? 0;
        let preparedWriteValues = updateChanges
            ? [preparedValues, updateChanges]
            : [preparedValues];
        runAfterWriteHook(this.#table, {
            operation: 'create',
            tableName: getTableName(this.#table),
            values: preparedWriteValues,
            affectedRows,
            insertId: result.insertId,
        });
        return {
            affectedRows,
            insertId: result.insertId,
        };
    }
    #toSelectOperation() {
        return {
            kind: 'select',
            table: this.#table,
            select: cloneSelection(this.#state.select),
            distinct: this.#state.distinct,
            joins: [...this.#state.joins],
            where: [...this.#state.where],
            groupBy: [...this.#state.groupBy],
            having: [...this.#state.having],
            orderBy: [...this.#state.orderBy],
            limit: this.#state.limit,
            offset: this.#state.offset,
        };
    }
    #clone(patch) {
        return new QueryBuilder(this.#database, this.#table, {
            select: patch.select ?? cloneSelection(this.#state.select),
            distinct: patch.distinct ?? this.#state.distinct,
            joins: patch.joins ? [...patch.joins] : [...this.#state.joins],
            where: patch.where ? [...patch.where] : [...this.#state.where],
            groupBy: patch.groupBy ? [...patch.groupBy] : [...this.#state.groupBy],
            having: patch.having ? [...patch.having] : [...this.#state.having],
            orderBy: patch.orderBy ? [...patch.orderBy] : [...this.#state.orderBy],
            limit: patch.limit === undefined ? this.#state.limit : patch.limit,
            offset: patch.offset === undefined ? this.#state.offset : patch.offset,
            with: patch.with ? { ...patch.with } : { ...this.#state.with },
        });
    }
}
export function createInitialQueryState() {
    return {
        select: '*',
        distinct: false,
        joins: [],
        where: [],
        groupBy: [],
        having: [],
        orderBy: [],
        with: {},
    };
}
function cloneSelection(selection) {
    if (selection === '*') {
        return '*';
    }
    return selection.map((column) => ({ ...column }));
}
function normalizeRows(rows) {
    if (!rows) {
        return [];
    }
    return rows.map((row) => ({ ...row }));
}
function assertWriteState(state, operation, policy) {
    let unsupported = [];
    if (state.select !== '*') {
        unsupported.push('select()');
    }
    if (state.distinct) {
        unsupported.push('distinct()');
    }
    if (state.joins.length > 0) {
        unsupported.push('join()');
    }
    if (state.groupBy.length > 0) {
        unsupported.push('groupBy()');
    }
    if (state.having.length > 0) {
        unsupported.push('having()');
    }
    if (Object.keys(state.with).length > 0) {
        unsupported.push('with()');
    }
    if (!policy.where && state.where.length > 0) {
        unsupported.push('where()');
    }
    if (!policy.orderBy && state.orderBy.length > 0) {
        unsupported.push('orderBy()');
    }
    if (!policy.limit && state.limit !== undefined) {
        unsupported.push('limit()');
    }
    if (!policy.offset && state.offset !== undefined) {
        unsupported.push('offset()');
    }
    if (unsupported.length > 0) {
        throw new DataTableQueryError(operation + '() does not support these query modifiers: ' + unsupported.join(', '));
    }
}
function createPredicateColumnResolver(tables) {
    let qualifiedColumns = new Map();
    let unqualifiedColumns = new Map();
    let ambiguousColumns = new Set();
    for (let table of tables) {
        let tableColumns = getTableColumns(table);
        let tableName = getTableName(table);
        for (let columnName in tableColumns) {
            if (!Object.prototype.hasOwnProperty.call(tableColumns, columnName)) {
                continue;
            }
            let resolvedColumn = {
                tableName,
                columnName,
            };
            qualifiedColumns.set(tableName + '.' + columnName, resolvedColumn);
            if (ambiguousColumns.has(columnName)) {
                continue;
            }
            if (unqualifiedColumns.has(columnName)) {
                unqualifiedColumns.delete(columnName);
                ambiguousColumns.add(columnName);
                continue;
            }
            unqualifiedColumns.set(columnName, resolvedColumn);
        }
    }
    return function resolveColumn(column) {
        let qualified = qualifiedColumns.get(column);
        if (qualified) {
            return qualified;
        }
        if (column.includes('.')) {
            throw new DataTableQueryError('Unknown predicate column "' + column + '"');
        }
        if (ambiguousColumns.has(column)) {
            throw new DataTableQueryError('Ambiguous predicate column "' + column + '". Use a qualified column name');
        }
        let unqualified = unqualifiedColumns.get(column);
        if (!unqualified) {
            throw new DataTableQueryError('Unknown predicate column "' + column + '"');
        }
        return unqualified;
    };
}
function normalizePredicateValues(predicate, resolveColumn) {
    if (predicate.type === 'comparison') {
        let column = resolveColumn(predicate.column);
        if (predicate.valueType === 'column') {
            resolveColumn(predicate.value);
            return predicate;
        }
        if (predicate.operator === 'in' || predicate.operator === 'notIn') {
            if (!Array.isArray(predicate.value)) {
                throw new DataTableValidationError('Invalid filter value for column "' +
                    column.columnName +
                    '" in table "' +
                    column.tableName +
                    '"', [{ message: 'Expected an array value for "' + predicate.operator + '" predicate' }], {
                    metadata: {
                        table: column.tableName,
                        column: column.columnName,
                    },
                });
            }
            return predicate;
        }
        return predicate;
    }
    if (predicate.type === 'between') {
        resolveColumn(predicate.column);
        return predicate;
    }
    if (predicate.type === 'null') {
        resolveColumn(predicate.column);
        return predicate;
    }
    return {
        ...predicate,
        predicates: predicate.predicates.map((child) => normalizePredicateValues(child, resolveColumn)),
    };
}
