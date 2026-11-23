function canTraverseRelation(row, anchorMemberIndex) {
    if (!['first_to_second', 'second_to_first', 'both'].includes(row.visibility_direction)) {
        throw new Error(`Invalid relation visibility direction: ${row.visibility_direction}`);
    }
    return row.visibility_direction === 'both' ||
        row.visibility_direction === (anchorMemberIndex === 0 ? 'first_to_second' : 'second_to_first');
}

function outwardDirection(anchorMemberIndex) {
    return anchorMemberIndex === 0 ? 'first_to_second' : 'second_to_first';
}

module.exports = { canTraverseRelation, outwardDirection };
