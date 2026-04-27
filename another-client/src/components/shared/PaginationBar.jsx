const buildPageItems = (currentPage, totalPages) => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const pageNumbers = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
    const orderedPages = Array.from(pageNumbers)
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((left, right) => left - right)

    const items = []

    orderedPages.forEach((page, index) => {
        if (index > 0 && page - orderedPages[index - 1] > 1) {
            items.push("ellipsis-" + page)
        }
        items.push(page)
    })

    return items
}

const PaginationBar = ({
    currentPage,
    totalPages,
    onPageChange,
    summaryText,
    mode = "full",
    canGoPrev = true,
    canGoNext = true,
    pageLabel,
    className = "",
}) => {
    if (mode === "compact") {
        return (
            <div className={`flex flex-col gap-3 border-t border-surface-line pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}>
                <p className="mb-0 text-sm font-medium text-ink-600">{summaryText}</p>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={!canGoPrev}
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    >
                        <i className="fas fa-chevron-left me-1"></i>Trước
                    </button>
                    {pageLabel ? (
                        <span className="inline-flex h-10 items-center rounded-full border border-surface-line bg-white px-4 text-sm font-semibold text-ink-700">
                            {pageLabel}
                        </span>
                    ) : null}
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={!canGoNext}
                        onClick={() => onPageChange(currentPage + 1)}
                    >
                        Sau<i className="fas fa-chevron-right ms-1"></i>
                    </button>
                </div>
            </div>
        )
    }

    if (!totalPages || totalPages <= 1) return null

    const pageItems = buildPageItems(currentPage, totalPages)

    return (
        <div className={`flex flex-col gap-3 border-t border-surface-line pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}>
            <p className="mb-0 text-sm font-medium text-ink-600">{summaryText}</p>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                >
                    <i className="fas fa-chevron-left me-1"></i>Trước
                </button>

                {pageItems.map((item) =>
                    typeof item === "number" ? (
                        <button
                            key={item}
                            type="button"
                            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition ${item === currentPage
                                    ? "bg-brand-600 text-white shadow-sm"
                                    : "border border-surface-line bg-white text-ink-700 hover:bg-surface-soft"
                                }`}
                            aria-current={item === currentPage ? "page" : undefined}
                            onClick={() => onPageChange(item)}
                        >
                            {item}
                        </button>
                    ) : (
                        <span key={item} className="px-1 text-sm font-bold text-ink-400">
                            …
                        </span>
                    )
                )}

                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                >
                    Sau<i className="fas fa-chevron-right ms-1"></i>
                </button>
            </div>
        </div>
    )
}

export default PaginationBar