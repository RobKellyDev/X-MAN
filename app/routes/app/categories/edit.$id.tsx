import {
  type ActionArgs,
  type LoaderArgs,
  json,
  redirect,
  type MetaFunction,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { safeRedirect, unauthorized, useHydrated } from "remix-utils";
import authenticated, {
  authCookie,
  getCategoryById,
  updateCategoryById,
} from "~/lib/supabase.server";
import TextInput from "~/components/TextInput";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/Dialog";
import useRedirectTo from "~/hooks/useRedirectTo";
import Button from "~/components/Button";
import MyLinkBtn from "~/components/MyLinkBtn";
import type { Category } from "~/types";
import { useState } from "react";
import ModalMessage from "~/components/ModalMessage";
import PageOverlayCenter from "~/components/PageOverlayCenter";

export const meta: MetaFunction = ({ data }: { data: LoaderData }) => {
  if (!data.category)
    return {
      title: "Not found | X Man",
    };
  return {
    title: `Edit ${data.category.name} | X Man`,
  };
};

type LoaderData = {
  message: string;
  category?: Category;
};
export async function loader({ request, params }: LoaderArgs) {
  const redirectTo = new URL(request.url).searchParams.get("redirectTo");

  const authSession = await authCookie.getSession(
    request.headers.get("Cookie")
  );
  const userId = authSession.get("user_id");
  if (!userId || typeof userId !== "string") {
    throw unauthorized({
      message: "You must be logged in to access this page",
    });
  }

  const id = params.id;

  if (!id) {
    throw redirect(safeRedirect(redirectTo, "/app/categories"));
  }

  const { category, error } = await getCategoryById({ id });
  // const { income, error } = await getIncomeById({ incomeId: id, userId });
  if (!category || error) {
    return json<LoaderData>(
      {
        message: "Not found.",
      },
      404
    );
  }

  return json<LoaderData>({
    message: "",
    category,
  });
}

type ActionData = {
  formError?: string;
  fields?: {
    name?: string;
  };
};
export async function action({ params, request }: ActionArgs) {
  return await authenticated(
    request,
    async () => {
      const id = params.id;

      if (!id) {
        return redirect("/app");
      }

      const form = await request.formData();

      const name = form.get("name");
      const redirectTo = form.get("redirectTo") || "/app/categories";

      if (!name || typeof name !== "string" || typeof redirectTo !== "string") {
        return json<ActionData>(
          {
            formError: `Form not submitted correctly.`,
            fields: {
              name: String(name) ?? "",
            },
          },
          403
        );
      }

      const { category, error: updateError } = await updateCategoryById({
        id,
        query: {
          name,
        },
      });

      if (!category || updateError) {
        return json<ActionData>(
          {
            formError: `Form not submitted correctly.`,
            fields: {
              name,
            },
          },
          403
        );
      }

      return redirect(safeRedirect(redirectTo, "/app/categories"));
    },
    () => {
      throw unauthorized({
        message: "You must be logged in to access this page",
      });
    }
  );
}

export default function Edit() {
  const { category } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const redirectTo = useRedirectTo() || "/app/categories";
  const [name, setName] = useState(
    actionData?.fields?.name || category?.name || ""
  );
  const isHydrated = useHydrated();
  if (!isHydrated) {
    return (
      <PageOverlayCenter className="px-4">
        <div className="mx-auto max-w-4xl rounded-lg bg-day-100 p-8 text-center dark:bg-night-500">
          <h1 className="text-5xl">Something went wrong</h1>
          <p className="mt-3 text-2xl">
            Looks like Javascript didn't load. Either because of bad network or
            your browser has disabled Javascript. Please reload the page or try
            again later.
          </p>
        </div>
      </PageOverlayCenter>
    );
  }

  if (!category) {
    return (
      <ModalMessage
        title="Not found"
        message="We couldn't find the category. Please head back to the categories."
      />
    );
  }

  return (
    <Dialog open modal>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            Edit <span className="font-bold italic">{category.name}</span>
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Edit <span className="font-bold italic">{category.name}</span> and
          then click save
        </DialogDescription>
        <Form method="post" replace className="flex flex-col gap-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div className="flex flex-col gap-2">
            <TextInput
              label="Title"
              id="title"
              type="text"
              name="title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <div className="mt-3 flex gap-2">
              <Button type="submit" disabled={name === category.name}>
                Edit
              </Button>
              <MyLinkBtn
                btnType="outline"
                to={redirectTo || "/app/categories"}
                type="submit"
              >
                Cancel
              </MyLinkBtn>
            </div>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
