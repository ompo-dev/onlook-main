import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/client';
import type { Branch } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { timeAgo } from '@onlook/utility/src/time';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { toast } from 'sonner';

interface BranchManagementProps {
    branch: Branch;
}

export const BranchManagement = observer(({ branch }: BranchManagementProps) => {
    const editorEngine = useEditorEngine();
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(branch.name);
    const [isForking, setIsForking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const isActiveBranch = editorEngine.branches.activeBranch.id === branch.id;
    const isOnlyBranch = editorEngine.branches.allBranches.length === 1;

    const handleClose = () => {
        editorEngine.state.branchTab = null;
        editorEngine.state.manageBranchId = null;
    };

    const handleRename = async () => {
        if (newName.trim() === branch.name || !newName.trim()) {
            setIsRenaming(false);
            setNewName(branch.name);
            return;
        }

        try {
            await editorEngine.branches.updateBranch(branch.id, {
                name: newName.trim(),
            });
            toast.success(`Branch renamed to "${newName.trim()}"`);
            setIsRenaming(false);
        } catch (error) {
            console.error('Failed to rename branch:', error);
            toast.error('Failed to rename branch', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
            setNewName(branch.name);
            setIsRenaming(false);
        }
    };

    const handleFork = async () => {
        if (isForking) return;

        try {
            setIsForking(true);
            await editorEngine.branches.forkBranch(branch.id);
            toast.success('Branch forked successfully');
            handleClose();
        } catch (error) {
            console.error('Failed to fork branch:', error);
            toast.error('Failed to fork branch');
        } finally {
            setIsForking(false);
        }
    };

    const handleDelete = async () => {
        if (isDeleting) return;

        try {
            setIsDeleting(true);

            // If this is the active branch, switch to a different one first
            if (isActiveBranch) {
                const allBranches = editorEngine.branches.allBranches;
                const otherBranches = allBranches.filter(b => b.id !== branch.id);

                if (otherBranches.length === 0) {
                    throw new Error('Cannot delete the last remaining branch');
                }

                // Find the default branch, or use the first available branch
                const targetBranch = otherBranches.find(b => b.isDefault) || otherBranches[0];

                if (!targetBranch) {
                    throw new Error('No target branch available for switching');
                }

                // Switch to the target branch first
                await editorEngine.branches.switchToBranch(targetBranch.id);
            }

            const success = await api.branch.delete.mutate({
                branchId: branch.id,
            });

            if (success) {
                editorEngine.branches.removeBranch(branch.id);
                toast.success('Branch deleted successfully');
                handleClose();
            } else {
                throw new Error('Failed to delete branch');
            }
        } catch (error) {
            console.error('Failed to delete branch:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete branch');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            setIsRenaming(false);
            setNewName(branch.name);
        }
    };

    return (
        <div className="flex h-full w-full flex-grow flex-col bg-[var(--cs-bg)] p-0 text-xs text-[var(--cs-foreground)]">
            <div className="flex items-center justify-start gap-2 border-b border-[var(--cs-border)] px-3 py-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg border border-[var(--cs-border)] bg-[var(--cs-layer)] text-[var(--cs-icon)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]"
                    onClick={handleClose}
                >
                    <Icons.ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-sm font-medium text-[var(--cs-foreground)]">Branch Settings</h2>
            </div>

            <div className="space-y-4 border-b border-[var(--cs-border)] p-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-[var(--cs-foreground)]">Name</label>
                        {isActiveBranch && (
                            <span className="rounded-full border border-[color:color-mix(in_srgb,var(--cs-accent)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--cs-accent)_15%,transparent)] px-2 py-1 text-[10px] font-medium text-[var(--cs-accent)]">
                                Active
                            </span>
                        )}
                    </div>
                    {isRenaming ? (
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleRename}
                            className="h-9 border-[var(--cs-border)] bg-[var(--cs-layer)] text-sm text-[var(--cs-foreground)] placeholder:text-[var(--cs-icon-muted)]"
                            autoFocus
                        />
                    ) : (
                        <div
                            className="flex cursor-pointer items-start justify-between rounded-xl border border-[var(--cs-border)] bg-[var(--cs-layer)] p-3 hover:bg-[var(--cs-layer-hover)]"
                            onClick={() => setIsRenaming(true)}
                        >
                            <span className="font-medium break-words min-w-0 flex-1 mr-2 leading-tight">{branch.name}</span>
                            <Icons.Pencil className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--cs-icon-muted)]" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 p-4 space-y-3">
                <div className="space-y-2">
                    <h3 className="text-sm text-[var(--cs-foreground)]">Actions</h3>
                    <div className="flex flex-col items-center gap-2 w-full">
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2 rounded-xl border-[var(--cs-border)] bg-[var(--cs-layer)] text-[var(--cs-foreground)] hover:bg-[var(--cs-layer-hover)]"
                            onClick={handleFork}
                            disabled={isForking}
                        >
                            {isForking ? (
                                <div className="flex items-center gap-2">
                                    <Icons.LoadingSpinner className="w-4 h-4" />
                                    <span>Forking...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Icons.Branch className="w-4 h-4" />
                                    <span>Fork</span>
                                </div>
                            )}
                        </Button>

                        <Button
                            variant="destructive"
                            className="w-full justify-start gap-2 rounded-xl border border-[color:color-mix(in_srgb,#ef4444_40%,transparent)] bg-[color:color-mix(in_srgb,#ef4444_12%,transparent)] text-[#fca5a5] hover:bg-[color:color-mix(in_srgb,#ef4444_18%,transparent)]"
                            onClick={handleDelete}
                            disabled={isDeleting || isOnlyBranch}
                            title={
                                isOnlyBranch
                                    ? "Cannot delete the last remaining branch"
                                    : "Delete branch"
                            }
                        >
                            {isDeleting ? (
                                <div className="flex items-center gap-2">
                                    <Icons.LoadingSpinner className="w-4 h-4" />
                                    <span>Deleting...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-[#fca5a5]">
                                    <Icons.Trash className="w-4 h-4" />
                                    <span>Delete</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="border-t border-[var(--cs-border)] pt-4">
                    <div className="space-y-2">
                        <div className="space-y-1 text-xs text-[var(--cs-icon-muted)]">
                            <div>Created {timeAgo(branch.createdAt)} ago</div>
                            <div>Last modified {timeAgo(branch.updatedAt)} ago</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
