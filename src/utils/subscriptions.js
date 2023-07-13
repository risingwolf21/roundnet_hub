export const drinks_subscription = (handleChange) => {
    return supabase
        .channel('any')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'drinks' }, handleChange)
        .subscribe();
}

export const drinks_initial_load = (handlePayload) => supabase
    .from('drinks')
    .select()
    .then(handlePayload);