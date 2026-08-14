package usecase

import (
	"errors"
	"testing"
)

type fakeFileReader struct {
	resolved       string
	content        string
	resolveErr     error
	readErr        error
	mtime          int64
	statErr        error
	writeErr       error
	writtenContent string
	writeCalled    bool
}

func (f *fakeFileReader) Resolve(abs string) (string, error) {
	return f.resolved, f.resolveErr
}

func (f *fakeFileReader) ReadFile(resolved string) (string, error) {
	if f.readErr != nil {
		return "", f.readErr
	}
	return f.content, nil
}

func (f *fakeFileReader) Stat(resolved string) (int64, error) {
	if f.statErr != nil {
		return 0, f.statErr
	}
	return f.mtime, nil
}

func (f *fakeFileReader) WriteFile(resolved string, content string) error {
	f.writeCalled = true
	f.writtenContent = content
	if f.writeErr != nil {
		return f.writeErr
	}
	return nil
}

func TestFileUsecase_Get(t *testing.T) {
	t.Run("success returns content", func(t *testing.T) {
		reader := &fakeFileReader{resolved: "/tmp/notes.md", content: "# Test"}
		result := FileUsecase{}.Get("/tmp/notes.md", reader)

		if result.Error != "" {
			t.Fatalf("unexpected error: %q", result.Error)
		}
		if result.Resolved != "/tmp/notes.md" {
			t.Fatalf("Resolved = %q, want /tmp/notes.md", result.Resolved)
		}
		if result.Content != "# Test" {
			t.Fatalf("Content = %q, want '# Test'", result.Content)
		}
	})

	t.Run("disallowed extension returns error", func(t *testing.T) {
		reader := &fakeFileReader{resolved: "/tmp/notes.txt", content: "content"}
		result := FileUsecase{}.Get("/tmp/notes.txt", reader)

		if result.Error == "" {
			t.Fatal("expected error for disallowed extension, got none")
		}
		if result.Error != "extension not allowed" {
			t.Fatalf("error = %q, want 'extension not allowed'", result.Error)
		}
		if result.Resolved != "/tmp/notes.txt" {
			t.Fatalf("Resolved should be set even on error")
		}
	})

	t.Run("resolve failure surfaces as error", func(t *testing.T) {
		reader := &fakeFileReader{resolveErr: errors.New("resolve failed")}
		result := FileUsecase{}.Get("/tmp/notes.md", reader)

		if result.Error == "" {
			t.Fatal("expected error, got none")
		}
		if result.Content != "" {
			t.Fatalf("Content should be empty on error")
		}
	})

	t.Run("read failure surfaces as error", func(t *testing.T) {
		reader := &fakeFileReader{
			resolved: "/tmp/notes.md",
			readErr:  errors.New("read failed"),
		}
		result := FileUsecase{}.Get("/tmp/notes.md", reader)

		if result.Error == "" {
			t.Fatal("expected error, got none")
		}
		if result.Resolved != "/tmp/notes.md" {
			t.Fatalf("Resolved should be set even on read error")
		}
		if result.Content != "" {
			t.Fatalf("Content should be empty on error")
		}
	})
}

func TestFileUsecase_Meta(t *testing.T) {
	t.Run("success returns mtime", func(t *testing.T) {
		reader := &fakeFileReader{resolved: "/tmp/notes.md", mtime: 1700000000000}
		result := FileUsecase{}.Meta("/tmp/notes.md", reader)

		if result.Error != "" {
			t.Fatalf("unexpected error: %q", result.Error)
		}
		if result.Resolved != "/tmp/notes.md" {
			t.Fatalf("Resolved = %q, want /tmp/notes.md", result.Resolved)
		}
		if result.Mtime != 1700000000000 {
			t.Fatalf("Mtime = %d, want 1700000000000", result.Mtime)
		}
	})

	t.Run("disallowed extension returns error", func(t *testing.T) {
		reader := &fakeFileReader{resolved: "/tmp/notes.txt", mtime: 1700000000000}
		result := FileUsecase{}.Meta("/tmp/notes.txt", reader)

		if result.Error == "" {
			t.Fatal("expected error for disallowed extension, got none")
		}
		if result.Error != "extension not allowed" {
			t.Fatalf("error = %q, want 'extension not allowed'", result.Error)
		}
		if result.Resolved != "/tmp/notes.txt" {
			t.Fatalf("Resolved should be set even on error")
		}
	})

	t.Run("nonexistent file returns error", func(t *testing.T) {
		reader := &fakeFileReader{resolved: "/tmp/notes.md", statErr: errors.New("file not found")}
		result := FileUsecase{}.Meta("/tmp/notes.md", reader)

		if result.Error == "" {
			t.Fatal("expected error, got none")
		}
		if result.Resolved != "/tmp/notes.md" {
			t.Fatalf("Resolved should be set even on error")
		}
		if result.Mtime != 0 {
			t.Fatalf("Mtime should be 0 on error")
		}
	})
}

func TestFileUsecase_Save(t *testing.T) {
	t.Run("success path with matching mtime", func(t *testing.T) {
		reader := &fakeFileReader{
			resolved: "/tmp/notes.md",
			mtime:    1700000000000,
		}
		result := FileUsecase{}.Save("/tmp/notes.md", "# New content", 1700000000000, reader)

		if result.Error != "" {
			t.Fatalf("unexpected error: %q", result.Error)
		}
		if result.Resolved != "/tmp/notes.md" {
			t.Fatalf("Resolved = %q, want /tmp/notes.md", result.Resolved)
		}
		if !reader.writeCalled {
			t.Fatal("WriteFile should have been called")
		}
		if reader.writtenContent != "# New content" {
			t.Fatalf("writtenContent = %q, want '# New content'", reader.writtenContent)
		}
		if result.Mtime != 1700000000000 {
			t.Fatalf("Mtime = %d, want 1700000000000", result.Mtime)
		}
	})

	t.Run("stale mtime returns error without writing", func(t *testing.T) {
		reader := &fakeFileReader{
			resolved: "/tmp/notes.md",
			mtime:    1700000000000,
		}
		result := FileUsecase{}.Save("/tmp/notes.md", "# New content", 1600000000000, reader)

		if result.Error == "" {
			t.Fatal("expected error for stale mtime, got none")
		}
		if result.Error != "stale" {
			t.Fatalf("error = %q, want 'stale'", result.Error)
		}
		if reader.writeCalled {
			t.Fatal("WriteFile should not have been called for stale mtime")
		}
	})

	t.Run("disallowed extension returns error", func(t *testing.T) {
		reader := &fakeFileReader{
			resolved: "/tmp/notes.txt",
			mtime:    1700000000000,
		}
		result := FileUsecase{}.Save("/tmp/notes.txt", "content", 1700000000000, reader)

		if result.Error == "" {
			t.Fatal("expected error for disallowed extension, got none")
		}
		if result.Error != "extension not allowed" {
			t.Fatalf("error = %q, want 'extension not allowed'", result.Error)
		}
		if reader.writeCalled {
			t.Fatal("WriteFile should not have been called for disallowed extension")
		}
	})
}
