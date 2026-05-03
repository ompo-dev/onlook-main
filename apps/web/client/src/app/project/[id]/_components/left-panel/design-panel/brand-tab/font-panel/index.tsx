import { useEditorEngine } from '@/components/store/editor';
import { VARIANTS } from '@onlook/fonts';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import debounce from 'lodash/debounce';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FontFamily } from './font-family';
import type { FontFile } from './font-files';
import UploadModal from './upload-modal';

const FontPanel = observer(() => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const editorEngine = useEditorEngine();
    const fontManager = editorEngine.font;
    const detectedProjectFonts = editorEngine.theme.projectFontFamilies;
    const fallbackFonts =
        !fontManager.fonts.length && detectedProjectFonts.length > 0 ? detectedProjectFonts : [];

    const handleClose = () => {
        editorEngine.state.brandTab = null;
    };

    const handleUploadFont = () => {
        setIsUploadModalOpen(true);
    };

    // TODO: use file system like code tab
    useEffect(() => {
        editorEngine.font.init();
    }, [editorEngine.activeSandbox.session.provider]);

    const handleFontUpload = async (fonts: FontFile[]) => {
        try {
            const success = await fontManager.uploadFonts(fonts);
            if (success) {
                toast.success('Fonts uploaded successfully');
            } else {
                toast.error('Failed to upload fonts');
            }
            return success;
        } catch (error) {
            console.error('Font upload failed:', error);
            toast.error('Failed to upload fonts', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    };

    const performSearch = useCallback(
        async (value: string) => {
            if (value.length > 0) {
                setIsLoading(true);
                try {
                    await fontManager.searchFonts(value);
                } catch (error) {
                    console.error('Failed to search fonts:', error);
                    toast.error('Failed to search fonts', {
                        description: error instanceof Error ? error.message : 'Unknown error',
                    });
                } finally {
                    setIsLoading(false);
                }
            }
        },
        [fontManager],
    );

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            performSearch(value);
        }, 300),
        [performSearch],
    );

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        debouncedSearch(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearchQuery('');
            inputRef.current?.blur();
        }
    };

    const handleLoadMore = async () => {
        if (isLoading || !fontManager.hasMoreFonts) {
            return;
        }

        setIsLoading(true);
        try {
            await fontManager.fetchNextFontBatch();
        } catch (error) {
            console.error('Failed to load more fonts:', error);
            toast.error('Failed to load more fonts', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const uniqueSiteFonts = searchQuery ? fontManager.searchResults : fontManager.systemFonts;

    return (
        <div className="flex h-full w-full flex-grow flex-col bg-[var(--cs-bg)] p-0 text-xs text-[var(--cs-foreground)]">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-[var(--cs-border)] px-4 py-2">
                <h2 className="text-sm font-medium text-[var(--cs-foreground)]">Fonts</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg border border-[var(--cs-border)] bg-[var(--cs-layer)] text-[var(--cs-icon)] hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)]"
                    onClick={handleClose}
                >
                    <Icons.CrossS className="h-4 w-4" />
                </Button>
            </div>

            {/* Search Bar - Fixed below header */}
            <div className="border-b border-[var(--cs-border)] px-4 py-3">
                <div className="relative">
                    <Icons.MagnifyingGlass className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cs-icon-muted)]" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Search for a new font..."
                        className="h-9 rounded-xl border-[var(--cs-border)] bg-[var(--cs-layer)] pl-7 pr-8 text-xs text-[var(--cs-foreground)] placeholder:text-[var(--cs-icon-muted)]"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    {searchQuery && (
                        <button
                            className="group absolute bottom-[1px] right-[1px] top-[1px] flex aspect-square items-center justify-center rounded-r-[calc(theme(borderRadius.xl)-1px)] hover:bg-[var(--cs-layer-hover)]"
                            onClick={() => handleSearch('')}
                        >
                            <Icons.CrossS className="h-3 w-3 text-[var(--cs-icon-muted)] group-hover:text-[var(--cs-foreground)]" />
                        </button>
                    )}
                    {isLoading && searchQuery && (
                        <div className="absolute right-9 top-1/2 -translate-y-1/2">
                            <Icons.LoadingSpinner className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area - Scrollable */}
            <div className="flex flex-col flex-1 overflow-y-auto">
                {/* System Fonts Section */}
                {searchQuery === '' && (
                    <div className="flex flex-col gap-1 pt-6 pb-3 border-b border-border">
                        {/* System Fonts Header */}
                        <div className="px-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-[var(--cs-icon-muted)]">
                                    Added fonts
                                </h3>
                                {fontManager.isScanning && (
                                    <Icons.LoadingSpinner className="h-3 w-3 animate-spin text-[var(--cs-icon-muted)]" />
                                )}
                            </div>
                        </div>

                        {/* System Font List */}
                        <div className="px-4">
                            <div className="flex flex-col divide-y divide-[var(--cs-border)]">
                                {fontManager.isScanning ? (
                                    <div className="my-2 flex h-20 items-center justify-center rounded-xl border border-dashed border-[var(--cs-border)] bg-[var(--cs-layer)]">
                                        <div className="flex items-center gap-2">
                                            <Icons.LoadingSpinner className="h-4 w-4 animate-spin text-muted-foreground" />
                                            <span className="text-sm text-[var(--cs-icon-muted)]">
                                                Scanning fonts...
                                            </span>
                                        </div>
                                    </div>
                                ) : fallbackFonts.length > 0 ? (
                                    fallbackFonts.map((fontFamily) => (
                                        <div key={`detected-${fontFamily}`}>
                                            <div className="flex justify-between items-center">
                                                <FontFamily
                                                    name={fontFamily}
                                                    variants={[]}
                                                    showDropdown={false}
                                                    showAddButton={false}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : !fontManager.fonts.length ? (
                                    <div className="my-2 flex h-20 items-center justify-center rounded-xl border border-dashed border-[var(--cs-border)] bg-[var(--cs-layer)]">
                                        <span className="text-sm text-[var(--cs-icon-muted)]">
                                            No fonts added
                                        </span>
                                    </div>
                                ) : (
                                    fontManager.fonts.map((font, index) => (
                                        <div key={`system-${font.family}-${index}`}>
                                            <div className="flex justify-between items-center">
                                                <FontFamily
                                                    name={font.family}
                                                    variants={
                                                        font.weight?.map(
                                                            (weight) =>
                                                                VARIANTS.find(
                                                                    (v) => v.value === weight,
                                                                )?.name,
                                                        ).filter((v) => v !== undefined) ?? []
                                                    }
                                                    showDropdown={true}
                                                    showAddButton={false}
                                                    isDefault={font.id === fontManager.defaultFont}
                                                    onRemoveFont={() =>
                                                        fontManager.removeFont(font)
                                                    }
                                                    onSetDefault={() =>
                                                        fontManager.setDefaultFont(font)
                                                    }
                                                    onClearDefault={() =>
                                                        fontManager.clearDefaultFont()
                                                    }
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Site Fonts Section */}
                <div className="flex flex-col gap-1 pt-6 pb-4">
                    {/* Site Fonts Header */}
                    <div className="px-4">
                        <h3 className="text-sm font-medium text-[var(--cs-icon-muted)]">
                            {searchQuery ? 'Search results' : 'Browse new fonts'}
                        </h3>
                    </div>

                    {/* Site Font List */}
                    <div className="px-4">
                        <div className="flex flex-col divide-y divide-[var(--cs-border)]">
                            {uniqueSiteFonts?.length > 0 ? (
                                uniqueSiteFonts.map((font, index) => (
                                    <div key={`${font.family}-${index}`}>
                                        <div className="flex justify-between items-center">
                                            <FontFamily
                                                name={font.family}
                                                variants={
                                                    font.weight?.map(
                                                        (weight) =>
                                                            VARIANTS.find((v) => v.value === weight)
                                                                ?.name,
                                                    ).filter((v) => v !== undefined) ?? []
                                                }
                                                showDropdown={false}
                                                showAddButton={true}
                                                onAddFont={() => fontManager.addFont(font)}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="my-2 flex h-20 items-center justify-center rounded-xl border border-dashed border-[var(--cs-border)] bg-[var(--cs-layer)]">
                                    <span className="text-sm text-[var(--cs-icon-muted)]">
                                        No results were found
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Load More Button */}
                        {fontManager.hasMoreFonts && !searchQuery && (
                            <Button
                                variant="ghost"
                                className="mt-4 h-9 w-full rounded-xl border border-[var(--cs-border)] bg-[var(--cs-layer)] text-sm text-[var(--cs-foreground)] hover:bg-[var(--cs-layer-hover)]"
                                onClick={handleLoadMore}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                                        <span>Loading...</span>
                                    </div>
                                ) : (
                                    'Load more fonts'
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Button - Fixed at bottom */}
            <div className="mt-auto border-t border-[var(--cs-border)] p-4">
                <Button
                    variant="ghost"
                    className="h-11 w-full rounded-xl border border-[var(--cs-border)] bg-[var(--cs-layer)] text-sm text-[var(--cs-foreground)] hover:bg-[var(--cs-layer-hover)]"
                    onClick={handleUploadFont}
                >
                    Upload a custom font
                </Button>
            </div>

            <UploadModal
                isOpen={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
                onUpload={handleFontUpload}
                isUploading={fontManager.isUploading}
            />
        </div>
    );
});

export default FontPanel;
