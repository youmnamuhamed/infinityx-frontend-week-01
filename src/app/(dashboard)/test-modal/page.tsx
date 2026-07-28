"use client";

import { useState } from "react";
import { Modal } from "@/components/compound/Modal";
import { Button } from "@/components/primitive/Button";

export default function TestModalPage() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ padding: 40 }}>
      <Modal open={open} onOpenChange={setOpen}>
        <Modal.Trigger asChild>
          <Button variant="primary">Deploy Cluster</Button>
        </Modal.Trigger>
        <Modal.Portal>
          <Modal.Overlay />
          <Modal.Content size="lg">
            <Modal.Header>
              <Modal.Title>Confirm Deployment</Modal.Title>
              <Modal.CloseButton />
            </Modal.Header>
            <Modal.Body>
              <p>
                Deployment summary contents go here. Try tabbing around,
                pressing Escape, and clicking the overlay.
              </p>
              <input
                placeholder="Some input to tab to"
                style={{ marginTop: 12, padding: 8, width: "100%" }}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger">Confirm</Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Portal>
      </Modal>
    </div>
  );
}
