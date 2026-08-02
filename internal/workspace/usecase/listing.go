package usecase

import (
	"madabyo/internal/workspace/external"
	"madabyo/internal/workspace/logics"
	"madabyo/internal/workspace/objects"
)

type ListingUsecase struct{}

func (ListingUsecase) List(raw string, lister external.DirLister) objects.ListResult {
	abs, err := logics.CleanAbs(raw)
	if err != nil {
		return objects.ListResult{Requested: raw, Error: "abs: " + err.Error()}
	}

	resolved, entries, err := lister.Resolve(abs)
	if err != nil {
		return objects.ListResult{Requested: raw, Resolved: resolved, Error: classifyResolveError(resolved, err)}
	}

	return objects.ListResult{Requested: raw, Resolved: resolved, Entries: entries}
}

func classifyResolveError(resolved string, err error) string {
	if resolved == "" {
		return "evalsymlinks: " + err.Error()
	}
	return "readdir: " + err.Error()
}
