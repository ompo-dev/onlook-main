import { useEditorEngine } from '@/components/store/editor';
import type { PageNode } from '@onlook/models/pages';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@onlook/ui/context-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useState } from 'react';
import { PageModal } from '../page-modal';

interface PageTreeNodeProps {
    node: {
        data: PageNode;
        toggle: () => void;
        select: () => void;
        isOpen: boolean;
    };
    style: React.CSSProperties;
}

export const PageTreeNode: React.FC<PageTreeNodeProps> = observer(({ node, style }) => {
    const editorEngine = useEditorEngine();
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'rename'>('create');

    const hasChildren = node.data.children && node.data.children.length > 0;
    const isActive = editorEngine.pages.isNodeActive(node.data);

    const getBaseName = (fullPath: string) => fullPath.split('/').pop() ?? '';

    const handleClick = async () => {
        if (hasChildren) {
            node.toggle();
        }

        const webviewId = editorEngine.frames.selected[0]?.frame.id;
        if (webviewId) {
            editorEngine.pages.setActivePath(webviewId, node.data.path);
        }

        editorEngine.pages.setCurrentPath(node.data.path);
        node.select();

        await editorEngine.pages.navigateTo(node.data.path);
    };

    const handleDelete = async () => {
        try {
            await editorEngine.pages.deletePage(
                node.data.path,
                Boolean(node.data.children && node.data.children.length > 0),
            );
        } catch (error) {
            console.error('Failed to delete page:', error);
            toast.error('Failed to delete page', {
                description: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const handleDuplicate = async () => {
        try {
            await editorEngine.pages.duplicatePage(node.data.path, node.data.path);
            toast('Page duplicated!');
        } catch (error) {
            console.error('Failed to duplicate page:', error);
            toast.error('Failed to duplicate page', {
                description: error instanceof Error ? error.message : String(error),
            });
        }
    };

    const menuItems = [
        {
            label: 'Create New Page',
            action: () => {
                setModalMode('create');
                setShowModal(true);
            },
            icon: <Icons.File className="mr-2 h-4 w-4" />,
        },
        {
            label: 'Duplicate Page',
            action: handleDuplicate,
            icon: <Icons.Copy className="mr-2 h-4 w-4" />,
            disabled: node.data.isRoot,
        },
        {
            label: 'Rename',
            action: () => {
                setModalMode('rename');
                setShowModal(true);
            },
            icon: <Icons.Pencil className="mr-2 h-4 w-4" />,
            disabled: node.data.isRoot,
        },
        {
            label: 'Delete',
            action: handleDelete,
            icon: <Icons.Trash className="mr-2 h-4 w-4" />,
            destructive: true,
            disabled: node.data.isRoot,
        },
    ];

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        style={style}
                        className={cn(
                            'flex h-6 cursor-pointer items-center rounded hover:bg-background-hover',
                            isActive && 'bg-red-500 text-white hover:bg-red-500/90',
                        )}
                        onClick={handleClick}
                    >
                        <span className="relative h-4 w-4 flex-none">
                            {hasChildren && (
                                <div className="absolute z-50 flex h-4 w-4 items-center justify-center">
                                    <motion.div
                                        initial={false}
                                        animate={{ rotate: node.isOpen ? 90 : 0 }}
                                    >
                                        <Icons.ChevronRight className="h-2.5 w-2.5" />
                                    </motion.div>
                                </div>
                            )}
                        </span>
                        {!node.data.isRoot &&
                            (hasChildren ? (
                                <Icons.Directory className="mr-2 h-4 w-4" />
                            ) : (
                                <Icons.File className="mr-2 h-4 w-4" />
                            ))}
                        <span>{node.data.name}</span>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {menuItems.map((item) => (
                        <ContextMenuItem
                            key={item.label}
                            onClick={item.action}
                            className="cursor-pointer"
                            disabled={item.disabled}
                        >
                            <span
                                className={cn(
                                    'flex w-full items-center gap-1',
                                    item.destructive && 'text-red',
                                )}
                            >
                                {item.icon}
                                {item.label}
                            </span>
                        </ContextMenuItem>
                    ))}
                </ContextMenuContent>
            </ContextMenu>

            <PageModal
                open={showModal}
                onOpenChange={setShowModal}
                mode={modalMode}
                baseRoute={node.data.path}
                initialName={modalMode === 'rename' ? getBaseName(node.data.path) : ''}
            />
        </>
    );
});
