import { useEffect, useState } from 'react';
import { AVATAR_EDGE, avatarDisplayUrl } from '../utils/avatarImage';

/** Profile photo that loads a resized WebP from storage when possible. */
export default function AvatarPhoto({
    url,
    edge = AVATAR_EDGE.card,
    alt = '',
    className = '',
    loading,
    onError,
    ...rest
}) {
    const optimized = avatarDisplayUrl(url, edge);
    const [src, setSrc] = useState(optimized);

    useEffect(() => {
        setSrc(avatarDisplayUrl(url, edge));
    }, [url, edge]);

    if (!url) return null;

    return (
        <img
            {...rest}
            src={src}
            alt={alt}
            className={className}
            decoding="async"
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
