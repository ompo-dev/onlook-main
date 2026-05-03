import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';
import { FileModal } from './modals/file-modal';
import { FolderModal } from './modals/folder-modal';
import { UploadModal } from './modals/upload-modal';

interface CodeControlsProps {
    isDirty: boolean;
    currentPath: string;
    onSave: () => Promise<void>;
    onRefresh: () => void;
    onCreateFile: (filePath: string, content?: string | Uint8Array) => Promise<void>;
    onCreateFolder: (folderPath: string) => Promise<void>;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isSidebarOpen: boolean) => void;
}

export const CodeControls = ({ isDirty, currentPath, onSave, onRefresh, onCreateFile, onCreateFolder, isSidebarOpen, setIsSidebarOpen }: CodeControlsProps) => {
    const [showFileModal, setShowFileModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!isDirty || isSaving) return;

        try {
            setIsSaving(true);
            await onSave();
        } catch (error) {
            console.error('Failed to save file:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleModalSuccess = () => {
        onRefresh();
    };

    return (
        <div className="flex h-11 w-full flex-row items-center justify-between border-b border-[var(--cs-border)] bg-[var(--cs-bg)] px-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="h-8 w-fit cursor-pointer rounded-xl border border-[var(--cs-border)] bg-[var(--cs-layer)] px-2 py-1 text-[var(--cs-icon)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]"
            >
                {isSidebarOpen ? <Icons.SidebarLeftCollapse className="h-4 w-4" /> : <Icons.MoveToFolder className="h-4 w-4" />}
                <span className="ml-1 text-xs">
                    {isSidebarOpen ? '' : 'View Files'}
                </span>
            </Button>
            <div className="flex flex-row items-center transition-opacity duration-200 ml-auto">

                <Tooltip>
                    <DropdownMenu>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 cursor-pointer rounded-xl border border-[var(--cs-border)] bg-[var(--cs-layer)] px-2 py-1 text-[var(--cs-icon)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]"
                                >
                                    <Icons.FilePlus className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl border border-[var(--cs-border)] bg-[var(--cs-bg-elevated)] text-[var(--cs-foreground)] shadow-2xl">
                            <DropdownMenuItem
                                className="cursor-pointer rounded-lg focus:bg-[var(--cs-layer-hover)]"
                                onClick={() => setShowFileModal(true)}
                            >
                                <Icons.FilePlus className="h-4 w-4 mr-2" />
                                Create new file
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer rounded-lg focus:bg-[var(--cs-layer-hover)]"
                                onClick={() => setShowUploadModal(true)}
                            >
                                <Icons.Upload className="h-4 w-4 mr-2" />
                                Upload file
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipContent side="bottom" hideArrow>
                        <p>Create or Upload File</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowFolderModal(true)}
                            className="h-8 w-8 cursor-pointer rounded-xl border border-[var(--cs-border)] bg-[var(--cs-layer)] px-2 py-1 text-[var(--cs-icon)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]"
                        >
                            <Icons.DirectoryPlus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" hideArrow>
                        <p>New Folder</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={handleSave}
                            disabled={!isDirty || isSaving}
                            className={cn(
                                "ml-1 h-8 w-fit cursor-pointer rounded-xl px-3 py-1",
                                isDirty
                                    ? "border border-[var(--cs-accent)] bg-[var(--cs-accent)] text-[var(--cs-on-accent)] hover:opacity-90"
                                    : "border border-[var(--cs-border)] bg-[var(--cs-layer)] text-[var(--cs-icon-muted)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]"
                            )}
                        >
                            {isSaving ? (
                                <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                            ) : (
                                <Icons.Save className={cn(
                                    "h-4 w-4",
                                    isDirty && "text-teal-200 group-hover:text-teal-100"
                                )} />
                            )}
                                <span className="text-xs">{isSaving ? 'Saving...' : 'Save'}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" hideArrow>
                        <p>{isSaving ? 'Saving changes...' : 'Save changes'}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <FileModal
                basePath={currentPath}
                show={showFileModal}
                setShow={setShowFileModal}
                onSuccess={handleModalSuccess}
                onCreateFile={onCreateFile}
            />
            <FolderModal
                basePath={currentPath}
                show={showFolderModal}
                setShow={setShowFolderModal}
                onSuccess={handleModalSuccess}
                onCreateFolder={onCreateFolder}
            />
            <UploadModal
                basePath={currentPath}
                show={showUploadModal}
                setShow={setShowUploadModal}
                onSuccess={handleModalSuccess}
                onCreateFile={onCreateFile}
            />
        </div >
    );
};
