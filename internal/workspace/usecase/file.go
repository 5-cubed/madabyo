package usecase

import (
	"madabyo/internal/workspace/external"
	"madabyo/internal/workspace/logics"
	"madabyo/internal/workspace/objects"
)

type FileUsecase struct{}

func (FileUsecase) Get(raw string, reader external.FileReader) objects.FileResult {
	abs, err := logics.CleanAbs(raw)
	if err != nil {
		return objects.FileResult{Requested: raw, Error: "abs: " + err.Error()}
	}
	resolved, err := reader.Resolve(abs)
	if err != nil {
		return objects.FileResult{Requested: raw, Error: "evalsymlinks: " + err.Error()}
	}
	if !logics.IsAllowedFile(resolved) {
		return objects.FileResult{Requested: raw, Resolved: resolved, Error: "extension not allowed"}
	}
	content, err := reader.ReadFile(resolved)
	if err != nil {
		return objects.FileResult{Requested: raw, Resolved: resolved, Error: "readfile: " + err.Error()}
	}
	return objects.FileResult{Requested: raw, Resolved: resolved, Content: content}
}

func (FileUsecase) Meta(raw string, reader external.FileReader) objects.MetaResult {
	abs, err := logics.CleanAbs(raw)
	if err != nil {
		return objects.MetaResult{Requested: raw, Error: "abs: " + err.Error()}
	}
	resolved, err := reader.Resolve(abs)
	if err != nil {
		return objects.MetaResult{Requested: raw, Error: "evalsymlinks: " + err.Error()}
	}
	if !logics.IsAllowedFile(resolved) {
		return objects.MetaResult{Requested: raw, Resolved: resolved, Error: "extension not allowed"}
	}
	mtime, err := reader.Stat(resolved)
	if err != nil {
		return objects.MetaResult{Requested: raw, Resolved: resolved, Error: "stat: " + err.Error()}
	}
	return objects.MetaResult{Requested: raw, Resolved: resolved, Mtime: mtime}
}

func (FileUsecase) Save(raw string, content string, expectedMtime int64, reader external.FileReader) objects.SaveResult {
	abs, err := logics.CleanAbs(raw)
	if err != nil {
		return objects.SaveResult{Requested: raw, Error: "abs: " + err.Error()}
	}
	resolved, err := reader.Resolve(abs)
	if err != nil {
		return objects.SaveResult{Requested: raw, Error: "evalsymlinks: " + err.Error()}
	}
	if !logics.IsAllowedFile(resolved) {
		return objects.SaveResult{Requested: raw, Resolved: resolved, Error: "extension not allowed"}
	}
	currentMtime, err := reader.Stat(resolved)
	if err != nil {
		return objects.SaveResult{Requested: raw, Resolved: resolved, Error: "stat: " + err.Error()}
	}
	if currentMtime != expectedMtime {
		return objects.SaveResult{Requested: raw, Resolved: resolved, Mtime: currentMtime, Error: "stale"}
	}
	err = reader.WriteFile(resolved, content)
	if err != nil {
		return objects.SaveResult{Requested: raw, Resolved: resolved, Mtime: currentMtime, Error: "write: " + err.Error()}
	}
	newMtime, err := reader.Stat(resolved)
	if err != nil {
		return objects.SaveResult{Requested: raw, Resolved: resolved, Mtime: currentMtime, Error: ""}
	}
	return objects.SaveResult{Requested: raw, Resolved: resolved, Mtime: newMtime}
}
