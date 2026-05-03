import { useEditorEngine } from '@/components/store/editor';
import { SystemTheme } from '@onlook/models/assets';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import type { Color } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { ColorNameInput } from './color-name-input';
import { BrandPalletGroup } from './color-pallet-group';

const ColorPanel = observer(() => {
    const [theme, setTheme] = useState<SystemTheme>(SystemTheme.LIGHT);
    const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);

    const editorEngine = useEditorEngine();
    const themeManager = editorEngine.theme;

    const { colorGroups, colorDefaults } = themeManager;

    useEffect(() => {
        themeManager.scanConfig();
    }, []);

    const handleRename = async (groupName: string, newName: string) => {
        await themeManager.rename(groupName, newName);
    };

    const handleDelete = async (groupName: string, colorName?: string) => {
        await themeManager.delete(groupName, colorName);
    };

    const handleColorChange = async (
        groupName: string,
        index: number,
        newColor: Color,
        newName: string,
        parentName?: string,
    ) => {
        await themeManager.update(groupName, index, newColor, newName, parentName, theme, false);
    };

    const handleColorChangeEnd = async (
        groupName: string,
        index: number,
        newColor: Color,
        newName: string,
        parentName?: string,
    ) => {
        await themeManager.update(groupName, index, newColor, newName, parentName, theme, true);
    };

    const handleDuplicate = async (
        groupName: string,
        colorName: string,
        isDefaultPalette?: boolean,
    ) => {
        await themeManager.duplicate(groupName, colorName, isDefaultPalette, theme);
    };

    const handleAddNewGroup = async (newName: string) => {
        await themeManager.add(newName);
        setIsAddingNewGroup(false);
    };

    const handleDefaultColorChange = async (
        groupName: string,
        colorIndex: number,
        newColor: Color,
    ) => {
        await themeManager.handleDefaultColorChange(groupName, colorIndex, newColor, theme);
    };

    const handleClose = () => {
        editorEngine.state.brandTab = null;
    };

    return (
        <div className="flex h-full w-full flex-grow flex-col overflow-y-auto bg-[var(--cs-bg)] p-0 text-xs text-[var(--cs-foreground)]">
            <div className="fixed left-0 right-0 top-0 z-10 flex items-center justify-start gap-2 border-b border-[var(--cs-border)] bg-[var(--cs-bg)] px-3 py-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg border border-[var(--cs-border)] bg-[var(--cs-layer)] text-[var(--cs-icon)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]"
                    onClick={handleClose}
                >
                    <Icons.ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-sm font-medium text-[var(--cs-foreground)]">Brand Colors</h2>
            </div>
            {/* Theme Toggle */}
            <div className="mt-[2.75rem] flex gap-2 border-b border-[var(--cs-border)] px-4 py-3">
                <Button
                    variant={theme === SystemTheme.LIGHT ? 'default' : 'outline'}
                    className={cn(
                        'w-full flex-1 gap-2 rounded-xl border px-0 shadow-none',
                        theme === SystemTheme.LIGHT
                            ? 'border-[var(--cs-accent)] bg-[color:color-mix(in_srgb,var(--cs-accent)_16%,transparent)] text-[var(--cs-foreground)]'
                            : 'border-[var(--cs-border)] bg-[var(--cs-layer)] text-[var(--cs-icon)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]',
                    )}
                    onClick={() => setTheme(SystemTheme.LIGHT)}
                >
                    <Icons.Sun className="h-4 w-4" />
                    Light mode
                </Button>
                <Button
                    variant={theme === SystemTheme.DARK ? 'default' : 'outline'}
                    className={cn(
                        'w-full flex-1 gap-2 rounded-xl border px-0 shadow-none',
                        theme === SystemTheme.DARK
                            ? 'border-[var(--cs-accent)] bg-[color:color-mix(in_srgb,var(--cs-accent)_16%,transparent)] text-[var(--cs-foreground)]'
                            : 'border-[var(--cs-border)] bg-[var(--cs-layer)] text-[var(--cs-icon)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]',
                    )}
                    onClick={() => setTheme(SystemTheme.DARK)}
                >
                    <Icons.Moon className="h-4 w-4" />
                    Dark mode
                </Button>
            </div>

            {/* Brand Palette Groups section */}
            <div className="flex flex-col gap-4 border-b border-[var(--cs-border)] px-4 py-[18px]">
                <div className="flex flex-col gap-3">
                    {/* Theme color groups */}
                    {Object.entries(colorGroups).map(([groupName, colors]) => (
                        <BrandPalletGroup
                            key={groupName}
                            theme={theme}
                            title={groupName}
                            colors={colors}
                            onRename={handleRename}
                            onDelete={(colorName) => handleDelete(groupName, colorName)}
                            onColorChange={handleColorChange}
                            onColorChangeEnd={handleColorChangeEnd}
                            onDuplicate={(colorName) => handleDuplicate(groupName, colorName)}
                        />
                    ))}
                </div>
                {isAddingNewGroup ? (
                    <div className="flex flex-col gap-1">
                        <ColorNameInput
                            initialName=""
                            onSubmit={handleAddNewGroup}
                            onCancel={() => setIsAddingNewGroup(false)}
                        />
                    </div>
                ) : (
                    <Button
                        variant="ghost"
                        className="h-10 w-full rounded-xl border border-[var(--cs-border)] bg-[var(--cs-layer)] text-sm text-[var(--cs-foreground)] hover:bg-[var(--cs-layer-hover)]"
                        onClick={() => setIsAddingNewGroup(true)}
                    >
                        Add a new group
                    </Button>
                )}
            </div>

            {/* Color Palette section */}
            <div className="flex flex-col gap-4 border-b border-[var(--cs-border)] px-4 py-[18px]">
                <h3 className="mb-1 text-sm font-medium">Default Colors</h3>
                {Object.entries(colorDefaults).map(([colorName, colors]) => (
                    <BrandPalletGroup
                        key={colorName}
                        theme={theme}
                        title={colorName}
                        colors={colors}
                        onRename={handleRename}
                        onDelete={(colorItem) => handleDelete(colorName, colorItem)}
                        onColorChange={(groupName, colorIndex, newColor) =>
                            handleDefaultColorChange(colorName, colorIndex, newColor)
                        }
                        onColorChangeEnd={(groupName, colorIndex, newColor) =>
                            handleDefaultColorChange(colorName, colorIndex, newColor)
                        }
                        onDuplicate={(colorItem) => handleDuplicate(colorName, colorItem, true)}
                        isDefaultPalette={true}
                    />
                ))}
            </div>
        </div>
    );
});

export default ColorPanel;
