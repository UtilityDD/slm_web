import { useEffect, useState } from 'react';
import { AVATAR_EDGE, avatarDisplayUrl } from '../utils/avatarImage';

/** Profile photo that loads a resized WebP from storage when possible. */
export default function AvatarPhoto({
    url,
    edge = AVATAR_EDGE.card,
    placeholderEdge,
    placeholderSrc = '',
    alt = '',
    className = '',
    loading,
    decoding = 'async',
    onError,
    ...rest
}) {
    const fullSrc = avatarDisplayUrl(url, edge);
    const fallbackPlaceholder = placeholderEdge != null ? avatarDisplayUrl(url, placeholderEdge) : '';
    const previewSrc = placeholderSrc || fallbackPlaceholder;
    const layered = Boolean(url && previewSrc && previewSrc !== fullSrc);

    const [src, setSrc] = useState(fullSrc);
    const [hiResSrc, setHiResSrc] = useState(fullSrc);
    const [hiResReady, setHiResReady] = useState(false);

    useEffect(() => {
        const nextFull = avatarDisplayUrl(url, edge);
        setSrc(nextFull);
        setHiResSrc(nextFull);
        setHiResReady(false);
    }, [url, edge, placeholderEdge, placeholderSrc]);

    if (!url) return null;

    if (layered) {
        return (
            <span className="relative block h-full w-full">
                <img
                    src={previewSrc}
                    alt=""
                    aria-hidden
                    className={`absolute inset-0 ${className}`}
                    decoding="sync"
                    draggable={false}
                />
                <img
                    {...rest}
                    src={hiResSrc}
                    alt={alt}
                    className={`absolute inset-0 ${className} transition-opacity duration-200 ${hiResReady ? 'opacity-100' : 'opacity-0'}`}
                    decoding={decoding}
                    loading={loading}
                    onLoad={() => setHiResReady(true)}
                    onError={() => {
                        if (url && hiResSrc !== url) {
                            setHiResSrc(url);
                            setHiResReady(false);
                            return;
                        }
                        onError?.();
                    }}
                />
            </span>
        );
    }

    return (
        <img
            {...rest}
            src={src}
            alt={alt}
            className={className}
            decoding={decoding}
            loading={loading}
            onError={() => {
                if (url && src !== url) {
                    setSrc(url);
                    return;
                }
                onError?.();
            }}
        />
    );
}

/** Already-decoded <img> src from a click on an avatar or its wrapper. */
export function imagePreviewFromEvent(event) {
    const target = event?.currentTarget || event?.target;
    if (!target) return '';
    if (target.tagName === 'IMG') return target.currentSrc || target.src || '';
    const img = typeof target.querySelector === 'function' ? target.querySelector('img') : null;
    return img?.currentSrc || img?.src || '';
}
