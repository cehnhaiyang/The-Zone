/**
 * 居民姓名库（英文名）
 * 提供给庇护所居民生成系统使用。
 * 纯静态数据 + 纯函数，零依赖。
 *
 * 组合规则：GIVEN_NAMES × SURNAMES 随机生成 "Given Surname"。
 * 生成时可通过 usedNames 排除已占用姓名。
 */

//=============================================================================
// 1. 姓氏库
//=============================================================================

export const SURNAMES: readonly string[] = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
    'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',

    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',

    'Lee', 'Perez', 'Thompson', 'White', 'Harris',
    'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',

    'Walker', 'Young', 'Allen', 'King', 'Wright',
    'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',

    'Green', 'Adams', 'Nelson', 'Baker', 'Hall',
    'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',

    'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz',
    'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',

    'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook',
    'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',

    'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard',
    'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',

    'Watson', 'Brooks', 'Chavez', 'Wood', 'James',
    'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',

    'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel',
    'Myers', 'Long', 'Ross', 'Foster', 'Jimenez',
];

//=============================================================================
// 2. 名字库
//=============================================================================

export const GIVEN_NAMES: readonly string[] = [
    'James', 'Mary', 'John', 'Patricia', 'Robert',
    'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth',

    'William', 'Barbara', 'Richard', 'Susan', 'Joseph',
    'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',

    'Christopher', 'Lisa', 'Daniel', 'Nancy', 'Matthew',
    'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',

    'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul',
    'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',

    'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian',
    'Dorothy', 'George', 'Melissa', 'Timothy', 'Deborah',

    'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason',
    'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia',

    'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas',
    'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna',

    'Stephen', 'Brenda', 'Larry', 'Pamela', 'Justin',
    'Nicole', 'Scott', 'Samantha', 'Brandon', 'Katherine',

    'Benjamin', 'Emma', 'Samuel', 'Ruth', 'Raymond',
    'Christine', 'Gregory', 'Catherine', 'Frank', 'Debra',

    'Alexander', 'Rachel', 'Patrick', 'Carolyn', 'Jack',
    'Janet', 'Dennis', 'Diane', 'Jerry', 'Alice',

    'Tyler', 'Aaron', 'Julie', 'Henry', 'Heather',
    'Douglas', 'Peter', 'Evelyn', 'Arthur', 'Frances',

    'Carl', 'Martha', 'Bruce', 'Helen', 'Roger',
    'Gloria', 'Keith', 'Teresa', 'Jeremy', 'Andrea',

    'Terry', 'Austin', 'Kathryn', 'Russell', 'Judith',
    'Howard', 'Rose', 'Eugene', 'Cheryl', 'Louis',

    'Mildred', 'Harry', 'Jane', 'Willie', 'Ann',
    'Ralph', 'Jean', 'Roy', 'Kathy', 'Wayne',

    'Theresa', 'Gerald', 'Bonnie', 'Fred', 'Jacqueline',
    'Joe', 'Norma', 'Albert', 'Marilyn', 'Sean',
];

//=============================================================================
// 3. 名字生成
//=============================================================================

function pickRandom<T>(pool: readonly T[]): T {
    if (pool.length === 0) {
        throw new Error('Name pool is empty');
    }

    return pool[Math.floor(Math.random() * pool.length)] as T;
}

/**
 * 从名字库 × 姓氏库随机组合一个居民英文姓名。
 *
 * @param usedNames 已占用姓名集合，可空。
 * @returns 形如 "James Carter" 的完整英文姓名。
 */
export function generateResidentName(usedNames?: ReadonlySet<string>): string {
    const maxAttempts = 32;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const name = `${pickRandom(GIVEN_NAMES)} ${pickRandom(SURNAMES)}`;

        if (!usedNames?.has(name)) {
            return name;
        }
    }

    let serial = (usedNames?.size ?? 0) + 1;
    let fallback = `Resident ${String(serial).padStart(3, '0')}`;

    while (usedNames?.has(fallback)) {
        serial += 1;
        fallback = `Resident ${String(serial).padStart(3, '0')}`;
    }

    return fallback;
}

/**
 * 从名字库 × 姓氏库随机生成一组互不重名的居民英文姓名。
 *
 * @param count 需要的名字数量。
 * @returns 完整英文姓名数组。
 */
export function generateResidentNames(count: number): string[] {
    const targetCount = Number.isFinite(count)
        ? Math.max(0, Math.floor(count))
        : 0;

    const used = new Set<string>();
    const names: string[] = [];

    for (let i = 0; i < targetCount; i += 1) {
        const name = generateResidentName(used);
        used.add(name);
        names.push(name);
    }

    return names;
}