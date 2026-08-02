package logics

import (
	"testing"

	"madabyo/internal/workspace/objects"
)

func TestValidateConfig(t *testing.T) {
	if err := ValidateConfig(objects.Config{WorkspacePath: "/tmp"}); err != nil {
		t.Fatalf("expected no error for non-empty path, got %v", err)
	}

	if err := ValidateConfig(objects.Config{WorkspacePath: ""}); err == nil {
		t.Fatal("expected error for empty path, got nil")
	}
}
