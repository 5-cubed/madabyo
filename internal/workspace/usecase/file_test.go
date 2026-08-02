package usecase

import (
	"errors"
	"testing"
)

type fakeFileReader struct {
	resolved      string
	content       string
	resolveErr    error
	readErr       error
}

func (f fakeFileReader) Resolve(abs string) (string, error) {
	return f.resolved, f.resolveErr
}

func (f fakeFileReader) ReadFile(resolved string) (string, error) {
	if f.readErr != nil {
		return "", f.readErr
	}
	return f.content, nil
}

func TestFileUsecase_Get(t *testing.T) {
	t.Run("success returns content", func(t *testing.T) {
		reader := fakeFileReader{resolved: "/tmp/notes.md", content: "# Test"}
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
		reader := fakeFileReader{resolved: "/tmp/notes.txt", content: "content"}
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
		reader := fakeFileReader{resolveErr: errors.New("resolve failed")}
		result := FileUsecase{}.Get("/tmp/notes.md", reader)

		if result.Error == "" {
			t.Fatal("expected error, got none")
		}
		if result.Content != "" {
			t.Fatalf("Content should be empty on error")
		}
	})

	t.Run("read failure surfaces as error", func(t *testing.T) {
		reader := fakeFileReader{
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
