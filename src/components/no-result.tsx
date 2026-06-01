import React from "react";

interface Props {
    message?: string;
}

export default function NoResult({ message = "暂无结果" }: Props) {
    return (
        <div className="grid gap-2 place-items-center">
            <span className="text-2xl">¯\_(ツ)_/¯</span>
            <span>{message}</span>
        </div>
    );
}
