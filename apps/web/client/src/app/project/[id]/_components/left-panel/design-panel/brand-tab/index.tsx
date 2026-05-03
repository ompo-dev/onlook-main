import { useEditorEngine } from '@/components/store/editor';
import { BrandTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import ColorPanel from './color-panel';
import FontPanel from './font-panel';
import SystemFont from './font-panel/system-font';

interface ColorSquareProps {
    color: string;
}

const ColorSquare = ({ color }: ColorSquareProps) => (
    <div
        className="w-full aspect-square cursor-pointer"
        style={{ backgroundColor: color }}
    />
);

export const BrandTab = observer(() => {
    const editorEngine = useEditorEngine();
    const [brandColors, setBrandColors] = useState<string[]>([]);

    // Get project brand colors
    useEffect(() => {
        const loadBrandColors = async () => {
            await editorEngine.theme.scanConfig();
            const { colorGroups, colorDefaults } = editorEngine.theme;

            // Extract color-500 variants from project colors
            const projectColors: string[] = [];

            // Add colors from custom color groups (user-defined in Tailwind config)
            Object.values(colorGroups).forEach(group => {
                group.forEach(color => {
                    // Get the default/500 color from each custom color group
                    if (color.name === '500' || color.name === 'default' || color.name === 'DEFAULT') {
                        projectColors.push(color.lightColor);
                    }
                });
            });

            // Add colors from default color groups (standard Tailwind colors)
            Object.values(colorDefaults).forEach(group => {
                group.forEach(color => {
                    // Get the default/500 color from each default color group
                    if (color.name === '500' || color.name === 'default' || color.name === 'DEFAULT') {
                        projectColors.push(color.lightColor);
                    }
                });
            });

            setBrandColors(Array.from(new Set(projectColors.filter(Boolean))));
        };

        loadBrandColors();
    }, [editorEngine.theme]);

    // If color panel is visible, show it instead of the main content
    if (editorEngine.state.brandTab === BrandTabValue.COLORS) {
        return <ColorPanel />;
    }

    // If font panel is visible, show it instead of the main content
    if (editorEngine.state.brandTab === BrandTabValue.FONTS) {
        return <FontPanel />;
    }

    return (
        <div className="flex h-full w-full flex-grow flex-col bg-[var(--cs-bg)] p-0 text-xs text-[var(--cs-foreground)]">
            {/* Brand Palette Section */}
            <div className="flex flex-col gap-3 border-b border-[var(--cs-border)] px-4 pb-6 pt-4">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Brand Colors</span>
                    </div>

                    <div
                        className="grid h-11 max-h-11 cursor-pointer grid-cols-12 overflow-hidden rounded-xl border border-[var(--cs-border)] bg-[var(--cs-layer)] transition-all duration-200 hover:border-[color:color-mix(in_srgb,var(--cs-accent)_35%,var(--cs-border))] hover:bg-[var(--cs-layer-hover)]"
                        onClick={() => (editorEngine.state.brandTab = BrandTabValue.COLORS)}
                    >
                        {brandColors.length > 0 ? (
                            brandColors.map((color, index) => (
                                <ColorSquare key={`brand-color-${index}`} color={color} />
                            ))
                        ) : (
                            Array.from({ length: 12 }, (_, index) => (
                                <div
                                    key={`loading-color-${index}`}
                                    className="w-full h-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 bg-[length:200%_100%] animate-shimmer"
                                />
                            ))
                        )}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="h-10 w-full rounded-xl border border-[var(--cs-border)] bg-[var(--cs-layer)] text-sm text-[var(--cs-foreground)] hover:bg-[var(--cs-layer-hover)]"
                    onClick={() => (editorEngine.state.brandTab = BrandTabValue.COLORS)}
                >
                    Manage brand colors
                </Button>
            </div>

            {/* Site Fonts Section */}
            <div className="flex flex-col gap-1.5 px-4 pt-5 pb-6">
                <div className="flex flex-col">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Site Fonts</span>
                    </div>
                    <SystemFont />
                </div>
                <Button
                    variant="ghost"
                    className="h-10 w-full rounded-xl border border-[var(--cs-border)] bg-[var(--cs-layer)] text-sm text-[var(--cs-foreground)] hover:bg-[var(--cs-layer-hover)]"
                    onClick={() => (editorEngine.state.brandTab = BrandTabValue.FONTS)}
                >
                    Manage site fonts
                </Button>
            </div>
        </div>
    );
});
