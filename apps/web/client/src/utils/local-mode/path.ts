export function isAbsoluteLocalPath(path: string | null | undefined): path is string {
    if (typeof path !== 'string') {
        return false;
    }

    return (
        /^[A-Za-z]:[\\/]/.test(path) ||
        path.startsWith('\\\\') ||
        path.startsWith('//') ||
        path.startsWith('/')
    );
}

export function normalizeLocalFolderPath(path: string | null | undefined): string | null {
    return isAbsoluteLocalPath(path) ? path : null;
}
